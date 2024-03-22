// adapted from https://github.com/xenova/transformers.js/blob/main/examples/segment-anything-client/worker.js
// TODO: investigate error when segmenting more than ~940 holds (with 4 workers) (244/246 with 1 worker?)

import { env, SamModel, AutoProcessor, RawImage } from "@xenova/transformers";
import cv from "@techstark/opencv-js";

env.allowLocalModels = false;

export class SegmentAnythingSingleton {
    static model_id = 'Xenova/slimsam-77-uniform';
    static model;
    static processor;
    static quantized = true;

    static getInstance() {
        if (!this.model) {
            this.model = SamModel.from_pretrained(this.model_id, {
                quantized: this.quantized,
                revision: 'boxes',
            });
        }
        if (!this.processor) {
            this.processor = AutoProcessor.from_pretrained(this.model_id, {
                revision: 'boxes',
            });
        }

        return Promise.all([this.model, this.processor]);
    }
}

let image_embeddings = null;
let image_inputs = null;
let ready = false;

self.onmessage = async (e) => {
    const [model, processor] = await SegmentAnythingSingleton.getInstance();
    if (!ready) {
        // Indicate that we are ready to accept requests
        console.log("worker ready");
        ready = true;
        self.postMessage({
            type: 'ready',
        });
    }

    const { type, data } = e.data;
    if (type === 'reset') {
        image_inputs = null;
        image_embeddings = null;

    } else if (type === 'segment') {
        // Indicate that we are starting to segment the image
        console.log("segmenting");
        self.postMessage({
            type: 'segment_result',
            data: 'start',
        });

        // Read the image and recompute image embeddings
        const image = await RawImage.read(data);
        image_inputs = await processor(image);
        image_embeddings = await model.get_image_embeddings(image_inputs);

        // Indicate that we have computed the image embeddings, and we are ready to accept decoding requests
        console.log("done segmenting");
        self.postMessage({
            type: 'segment_result',
            data: 'done',
        });

    } else if (type === 'decode') {
        const {hold_id, bbox, hold_i} = data;
        let input_boxes = [[bbox]];
        const outputs = await model({
            ...image_embeddings,
            input_points: null,
            input_labels: null,
            input_boxes: processor.reshape_input_points(
                input_boxes,
                image_inputs.original_sizes,
                image_inputs.reshaped_input_sizes,
                true
            )
        });
        
        let best_mask_i = 0;
        let bestScore = outputs.iou_scores.data[0];
        for (let i = 1; i < 3; i++) { // TODO: don't hardcode number of masks
            if (outputs.iou_scores.data[i] > bestScore) {
                best_mask_i = i;
                bestScore = outputs.iou_scores.data[i];
            }
        }
        const contours = (
            post_process_masks(
                outputs.pred_masks[0][0][best_mask_i].data,
                image_inputs.original_sizes[0],
                image_inputs.reshaped_input_sizes[0],
                processor.feature_extractor.pad_size));

        // Send the result back to the main thread
        self.postMessage({
            type: 'decode_result',
            data: {
                hold_id: hold_id,
                hold_i: hold_i,
                contours: contours,
                score: bestScore,
            },
        });
    } else {
        throw new Error(`Unknown message type: ${type}`);
    }
}

function post_process_masks(mask, original_size, reshaped_input_size, pad_size) {
    // mask: [256, 256]
    let opencv_mask_a = cv.matFromArray(256, 256, cv.CV_32FC1, mask);
    // upscale mask to padded size
    let padded_size = new cv.Size(pad_size.height, pad_size.width);
    // OpenCV.js is a flawless library with no flaws,
    // so to prevent memory leakage each operation needs to go into a new Mat
    // which is then deleted.
    let opencv_mask_b = new cv.Mat();
    cv.resize(opencv_mask_a, opencv_mask_b, padded_size, cv.INTER_LINEAR);
    // crop mask
    let roi = new cv.Rect(0, 0, reshaped_input_size[1], reshaped_input_size[0]);
    opencv_mask_a = opencv_mask_b.roi(roi);
    // downscale mask
    let downscaled_size = new cv.Size(original_size[1], original_size[0]);
    cv.resize(opencv_mask_a, opencv_mask_b, downscaled_size, cv.INTER_LINEAR);

    // To 8 bit for contour detection
    opencv_mask_b.convertTo(opencv_mask_a, cv.CV_8UC1);
    // erode away stray pixels
    let M = cv.Mat.ones(5, 5, cv.CV_8UC1);
    let anchor = new cv.Point(-1, -1);
    cv.erode(opencv_mask_a, opencv_mask_b, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    cv.dilate(opencv_mask_b, opencv_mask_a, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    
    // find contours (external only)
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(opencv_mask_a, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);
    let contourArray = [];
    let tmp = new cv.Mat();
    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let epsilon = 0.002 * cv.arcLength(contour, true);
        cv.approxPolyDP(contour, tmp, epsilon, true);
        contourArray.push(Array.from(tmp.data32S));
    }
    // free memory again
    tmp.delete();
    opencv_mask_a.delete();
    opencv_mask_b.delete();
    M.delete();
    contours.delete();
    hierarchy.delete();

    return contourArray;
}
