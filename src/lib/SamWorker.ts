// adapted from https://github.com/xenova/transformers.js/blob/main/examples/segment-anything-client/worker.js

import { env, SamModel, AutoProcessor, RawImage, Tensor } from "@xenova/transformers";

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
        const {bbox, hold_i} = data;
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
        const masks = (
            await processor.post_process_masks(
                outputs.pred_masks,
                image_inputs.original_sizes,
                image_inputs.reshaped_input_sizes))[0][0];
        
        let bestMask = masks[0];
        let bestScore = outputs.iou_scores.data[0];
        for (let i = 1; i < masks.dims[1]; i++) {
            if (outputs.iou_scores.data[i] > bestScore) {
                bestMask = masks[i];
                bestScore = outputs.iou_scores.data[i];
            }
        }
        const imgMask = bestMask.mul(255).unsqueeze(0);

        // Send the result back to the main thread
        console.log("done decoding");
        self.postMessage({
            type: 'decode_result',
            data: {
                hold_i: hold_i,
                mask: await RawImage.fromTensor(imgMask).toBlob(),
                score: bestScore,
            },
        });

    } else {
        throw new Error(`Unknown message type: ${type}`);
    }
}
