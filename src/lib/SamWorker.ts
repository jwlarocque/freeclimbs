// adapted from https://github.com/xenova/transformers.js/blob/main/examples/segment-anything-client/worker.js

import { env, SamModel, AutoProcessor, RawImage, Tensor } from "@xenova/transformers";
import { interpolate, stack } from "@xenova/transformers";
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
        console.log("decoding");
        const {decode_id, bbox, hold_i} = data;
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
        const mask = (
            await post_process_masks(
                outputs.pred_masks[0][0][best_mask_i],
                image_inputs.original_sizes[0],
                image_inputs.reshaped_input_sizes[0],
                processor.feature_extractor.pad_size));

        // Send the result back to the main thread
        console.log("done decoding");
        self.postMessage({
            type: 'decode_result',
            data: {
                decode_id: decode_id,
                hold_i: hold_i,
                mask: mask,
                score: bestScore,
            },
        });

    } else {
        throw new Error(`Unknown message type: ${type}`);
    }
}

function post_process_masks(mask, original_size, reshaped_input_size, pad_size, {
    mask_threshold = 0.0,
    binarize = true,
} = {}) {
    // mask: [256, 256]

    const target_image_size = [pad_size.height, pad_size.width];

    // Upscale mask to padded size
    let interpolated_mask = interpolate(mask, target_image_size, 'bilinear', false);

    // Crop mask
    interpolated_mask = interpolated_mask.slice(null, [0, reshaped_input_size[0]], [0, reshaped_input_size[1]]);
    // Downscale mask
    interpolated_mask = interpolate(interpolated_mask, [original_size[0], original_size[1]], 'bilinear', false);

    // Binarize mask
    const data = new Uint8Array(interpolated_mask.data.length);
    for (let i = 0; i < interpolated_mask.data.length; ++i) {
        if (interpolated_mask.data[i] > 0) {
            data[i] = 1;
        }
    }
    
    let mat = cv.matFromArray(original_size[0], original_size[1], cv.CV_8UC1, data);
    let M = cv.Mat.ones(5, 5, cv.CV_8UC1);
    let anchor = new cv.Point(-1, -1)
    cv.erode(mat, mat, M, anchor, 1, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    cv.dilate(mat, mat, M, anchor, 2, cv.BORDER_CONSTANT, cv.morphologyDefaultBorderValue());
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();
    cv.findContours(mat, contours, hierarchy, cv.RETR_CCOMP, cv.CHAIN_APPROX_SIMPLE);
    let poly = new cv.MatVector();
    let contourArray = [];
    for (let i = 0; i < contours.size(); i++) {
        let tmp = new cv.Mat();
        let contour = contours.get(i);
        let epsilon = 0.002 * cv.arcLength(contour, true);
        cv.approxPolyDP(contour, tmp, epsilon, true);
        poly.push_back(tmp);
        // TODO: try skipping `poly` again and getting data directly from the contour
        //       careful of memory leaks (don't send the ArrayBuffer to the main thread)
        // contourArray.push(tmp.data32S);
        contour.delete();
        tmp.delete();
    }
    for (let i = 0; i < poly.size(); i++) {
        contourArray.push(Array.from(poly.get(i).data32S));
    }
    mat.delete();
    M.delete();
    poly.delete();
    contours.delete();
    hierarchy.delete();

    console.log(contourArray);
    return contourArray;
}

