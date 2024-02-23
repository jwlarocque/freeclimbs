<script lang="ts">
    import createPanZoom from "panzoom";
    import { env, SamModel, AutoProcessor, RawImage, Tensor } from "@xenova/transformers";
    import { cat, stack } from "@xenova/transformers";

    import type { Hold } from "$lib/Hold";
	import Page from "../routes/+page.svelte";
    import SamWorker from "$lib/SamWorker?worker";

    export let wallImgURL;
    export let holds:Hold[];

    env.allowLocalModels = false;

    const DIRS = {
        "left": [1, 0.5, 0, 0.5],
        "top": [0.5, 1, 0.5, 0],
        "right": [0, 0.5, 1, 0.5],
        "bottom": [0.5, 0, 0.5, 1]
    };
    const RESIZE_HANDLE_RADIUS = 7;

    // TODO: consider multithreading
    const segmentationWorker = new SamWorker();
    let segmentationWorkerReady = false;
    let segmentationWorkerEmbedded = false;
    segmentationWorker.onmessage = async (e) => {
        const {type, data} = e.data;
        if (type === 'ready') {
            segmentationWorkerReady = true;
        } else if (type === 'segment_result') {
            if (data == "start") {
                segmentationWorkerEmbedded = false;
            } else if (data == "done") {
                segmentationWorkerEmbedded = true;
            }
        } else if (type === 'decode_result') {
            const {hold_i, mask, score} = data;
            holds[hold_i].mask = mask;
            drawMask(hold_i);
        }
    };

    let holdsOverlayContainer;
    let holdsOverlay;
    let segmentationCanvas;
    let wallImg;
    let wallImgLoaded = false;
    let panzoom;
    let clickDisabled = false;
    let selectedHold = null;
    let selectedHoldi;
   
    $: if (wallImgLoaded && panzoom) {
        panzoom.zoomTo(0, 0, holdsOverlay.clientWidth / wallImg.width);
    }
    $: if (wallImg) {
        wallImg.onload = () => {
            wallImgLoaded = true;
        };
    };

    $: if (holdsOverlay) {
        panzoom = createPanZoom(holdsOverlay, {
            maxZoom: 10,
            minZoom: 0.1,
            onTouch: (e) => {return false;}
        });
    }

    function handleHoldClick(event) {
        if (clickDisabled) {
            return;
        }
        let candidates = [];
        for (let hold of holds) {
            if (event.offsetY >= hold.top
                && event.offsetY <= hold.bottom
                && event.offsetX >= hold.left
                && event.offsetX <= hold.right
            ){
                candidates.push(hold);
            }
        }
        if (!candidates) {
            selectedHold = null;
        }
        // we could store distances but this is super fast enough
        candidates.sort((a, b) => {
            let adx = ((a.left + a.right) / 2 - event.offsetX) ** 2;
            let ady = ((a.top + a.bottom) / 2 - event.offsetY) ** 2;
            let bdx = ((b.left + b.right) / 2 - event.offsetX) ** 2;
            let bdy = ((b.top + b.bottom) / 2 - event.offsetY) ** 2;
            return (adx + ady) - (bdx + bdy);
        });
        selectedHold = candidates[0];
        selectedHoldi = holds.findIndex((h) => h.id == selectedHold.id); // TODO: awk

        if (selectedHold?.mask) {
            drawMask(selectedHoldi);
        }
    }

    function handleHoldKeypress(hold) {
        selectedHold = hold;
    }

    let resizingDir;
    function startHoldResize(e, dir) {
        e.preventDefault();
        e.stopPropagation();
        resizingDir = dir;
        if (e?.offsetX) {
            resizeHold(e.offsetX, e.offsetY);
        }
    }

    function handleResizeMouseMove(e) {
        resizeHold(e.offsetX, e.offsetY);
    }

    function resizeHold(x, y) {
        // TODO: very verbose
        if (resizingDir == "left") {
            holds[selectedHoldi].left = Math.min(x, holds[selectedHoldi].right - 5);
        } else if (resizingDir == "top") {
            holds[selectedHoldi].top = Math.min(y, holds[selectedHoldi].bottom - 5);
        } else if (resizingDir == "right") {
            holds[selectedHoldi].right = Math.max(x, holds[selectedHoldi].left + 5);
        } else if (resizingDir == "bottom") {
            holds[selectedHoldi].bottom = Math.max(y, holds[selectedHoldi].top + 5);
        }
    }

    async function handleResizeEnd(e) {
        resizingDir = null;
        // if (selectedHoldi) {
        //     selectedHoldi = null;
        //     selectedHold = null;
        // }
        if (imageEmbeddings && selectedHold) {
            await segmentHold(imageEmbeddings, selectedHold);
            drawMask(selectedHoldi);
        }
    }

    function deleteSelectedHold() {
        if (selectedHoldi != null) {
            holds.splice(selectedHoldi, 1);
            selectedHoldi = null;
            selectedHold = null;
            holds = holds;
        }
    }

    function previewAddHold() {
        // TODO: implement new hold preview
        return;
    }

    function addHold() {
        if (!(holdsOverlay && holdsOverlayContainer)) {
            return;
        }
        let containerRect = holdsOverlayContainer.getBoundingClientRect();
        let transform = panzoom.getTransform()
        let zoom = transform.scale;
        let panX = transform.x;
        let panY = transform.y;
        holds.push({
            id: String(holds.length),
            left: -1/zoom * (panX - containerRect.width * 0.2),
            top: -1/zoom * (panY - containerRect.height * 0.2),
            right: -1/zoom * (panX - containerRect.width * 0.8),
            bottom: -1/zoom * (panY - containerRect.height * 0.8)
        });
        console.log(holds[holds.length - 1]);
        holds = holds;
        selectedHoldi = holds.length - 1;
        selectedHold = holds[holds.length - 1];
    }

    async function segmentHolds() {
        if (!wallImgURL) {
            return;
        }
        // await segmentationWorker.postMessage({type: 'reset'});
        // segmentationWorkerEmbedded = false;
        if (!segmentationWorkerEmbedded) {
            await segmentationWorker.postMessage({type: 'segment', data: wallImgURL});
            return;
        }
        for (let i = 0; i < holds.length; i++) {
            await segmentationWorker.postMessage({
                type: 'decode',
                data: {
                    bbox: [holds[i].left, holds[i].top, holds[i].right, holds[i].bottom],
                    hold_i: i
                }
            });
        }
    }

    let maskData;
    let scores;
    let imageInputs;
    let imageEmbeddings;
    let model;
    let processor;
    let segmented = false;
    async function oldsegmentHolds() {
        if (segmented) {
            return;
        }
        segmented = true;
        if (!model) {
            model = await SamModel.from_pretrained(
                "Xenova/slimsam-77-uniform", {
                    revision: 'boxes',
            });
        }
        if (!processor) {
            processor = await AutoProcessor.from_pretrained(
                "Xenova/slimsam-77-uniform", {
                    revision: 'boxes',
            });
        }
        if (!imageEmbeddings) {
            let embed_time_start = performance.now();
            const rawImage = await RawImage.read(wallImgURL);
            console.log(rawImage);
            imageInputs = await processor(rawImage);
            console.log(imageInputs);
            imageEmbeddings = await model.get_image_embeddings(imageInputs);
            console.log("embed time: ", performance.now() - embed_time_start, " ms");
        }

        let segment_time_start = performance.now();
        for (let i = 0; i < holds.length; i++) {
            await segmentHold(imageEmbeddings, holds[i]);
            drawMask(i);
        }
        console.log("segment time: ", performance.now() - segment_time_start, " ms");
    }

    async function segmentHold(imageEmbeddings, hold) {
        let input_boxes = [[[hold.left, hold.top, hold.right, hold.bottom]]];
        const outputs = await model({
            ...imageEmbeddings,
            input_points: null,
            input_labels: null,
            input_boxes: processor.reshape_input_points(
                input_boxes,
                imageInputs.original_sizes,
                imageInputs.reshaped_input_sizes,
                true
            )
        });
        const masks = (await processor.post_process_masks(outputs.pred_masks, imageInputs.original_sizes, imageInputs.reshaped_input_sizes))[0][0];
        let bestMask = masks[0];
        let bestScore = outputs.iou_scores.data[0];
        for (let i = 1; i < masks.dims[1]; i++) {
            if (outputs.iou_scores.data[i] > bestScore) {
                bestMask = masks[i];
                bestScore = outputs.iou_scores.data[i];
            }
        }
        // create image from bestMask tensor (tensors are transformers.js tensors, _not_ tensorflow tensors)
        let imgMask = bestMask.mul(255).unsqueeze(0);
        let image = await RawImage.fromTensor(imgMask);
        hold.mask = await image.toBlob();
        // draw image
        // segmentationCanvas.width = wallImg.width;
        // segmentationCanvas.height = wallImg.height;
        // let ctx = segmentationCanvas.getContext("2d");
        // console.log(image.toCanvas());
        // ctx.drawImage(image.toCanvas(), 0, 0);
    }

    // $: if (selectedHoldi != null && holds[selectedHoldi] && holds[selectedHoldi]?.mask) {
    //     drawMask(selectedHoldi);
    // }

    $: if (selectedHoldi == null && segmentationCanvas) {
        const ctx = segmentationCanvas.getContext("2d");
        ctx.clearRect(0, 0, segmentationCanvas.width, segmentationCanvas.height);
    }

    function drawMask(segment_i) {
        if (!segmentationCanvas) {
            return;
        }
        segmentationCanvas.width = wallImg.width;
        segmentationCanvas.height = wallImg.height;
        const ctx = segmentationCanvas.getContext("2d");
        ctx.clearRect(0, 0, segmentationCanvas.width, segmentationCanvas.height);
        ctx.globalAlpha = 0.2;
        let img = new Image;
        img.src = URL.createObjectURL(holds[segment_i].mask);
        img.onload = () => {
            ctx.drawImage(img, 0, 0);
        };
        // const imageData = ctx.createImageData(segmentationCanvas.width, segmentationCanvas.height);
        // for (let i = 0; i < imageData.data.length / 4; i += 1) {
        //     // TODO: this is dumb
        //     let x = i % segmentationCanvas.width;
        //     let y = Math.floor(i / segmentationCanvas.width);
        //     // if (x < holds[selectedHoldi].left || x > holds[selectedHoldi].right || y < holds[selectedHoldi].top || y > holds[selectedHoldi].bottom) {
        //     //     continue;
        //     // }
        //     if (holds[segment_i].mask[y][x] > 0) {
        //         imageData.data[i * 4 + 0] = 0; // r
        //         imageData.data[i * 4 + 1] = 121; // g
        //         imageData.data[i * 4 + 2] = 180; // b
        //         imageData.data[i * 4 + 3] = 127; // a
        //     }
        // }
        // ctx.putImageData(imageData, 0, 0);
    }

    async function drawMasks() {
        console.log(maskData);
        if (!segmentationCanvas) {
            return;
        }
        segmentationCanvas.width = wallImg.width;
        segmentationCanvas.height = wallImg.height;
        const ctx = segmentationCanvas.getContext("2d");
        ctx.clearRect(0, 0, segmentationCanvas.width, segmentationCanvas.height);
        const imageData = ctx.createImageData(segmentationCanvas.width, segmentationCanvas.height);
        // TODO: remove debug
        let drawStart = performance.now();
        for (let i = 0; i < maskData.dims[0]; i++) {
            let bestMask = maskData[i][0];
            let bestMaski = 0;
            for (let j = 1; j < maskData.dims[1]; j++) {
                if (scores[i][j] > scores[i][bestMaski]) {
                    bestMask = maskData[i][j];
                    bestMaski = j;
                }
            }
            let mask = bestMask.tolist();
            for (let i = 0; i < imageData.data.length / 4; i += 1) {
                let thisVal = mask[Math.floor(i / segmentationCanvas.width)][i % segmentationCanvas.width];
                if (thisVal > 0) {
                    imageData.data[i * 4 + 0] = 0; // r
                    imageData.data[i * 4 + 1] = 121; // g
                    imageData.data[i * 4 + 2] = 180; // b
                    imageData.data[i * 4 + 3] = 127; // a
                }
            }
        }
        ctx.putImageData(imageData, 0, 0);
        console.log("done, draw took", performance.now() - drawStart, "ms");
    }
</script>


<style>
    main {
        max-width: calc(max(94%, 100% - 4em));
        margin: auto;
    }

    #holdsUIContainer {
        position: relative;
        overflow: hidden;
        height: 90vh;
        box-shadow: inset 0 0 3px;
        border-radius: 10px;
        background-color: #fdfdfd;
        background-image: radial-gradient(#cccccc 1.5px, #918c8a 1.5px);
        background-size: 26px 26px;
    }

    #holdsUI {
        position: relative;
        display: inline-block;
    }

    #holdsUI > img {
        display: block;
        box-shadow: 0 0 5px black;
    }

    #holdsUI > svg, #holdsUI > canvas {
        position: absolute;
        left: 0;
        top: 0;
    }

    .draggable {
        
    }

    .draggable-ew {
        cursor: ew-resize
    }

    .draggable-ns {
        cursor: ns-resize;
    }

    #controls {
        position: relative;
        z-index: 10;
        max-width: 90%;
        min-width: 10%;
        width: fit-content;
        margin: auto;
        box-shadow: 0 0 3px black;
        background-color: lightgrey;
        padding: 0.6em;
        border-radius: 0 0 10px 10px;
        display: flex;
        flex-direction: row;
        gap: 0.6em;
        align-content: space-around;
    }

    #controls button {
        border: none;
        background-color: transparent;
        cursor: pointer;
    }

    button.delete {
        color: rgb(194, 15, 15);
    }

    button.deemph {
        color: #918c8a;
    }
</style>

<main>
<div id="holdsUIContainer" bind:this={holdsOverlayContainer} on:touchmove={(e) => e.preventDefault()}>
    <div id="controls">
        <button on:click={addHold} on:mouseover={previewAddHold} on:focus={previewAddHold}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                <path d="M680-80v-120H560v-80h120v-120h80v120h120v80H760v120h-80ZM200-200v-200h80v120h120v80H200Zm0-360v-200h200v80H280v120h-80Zm480 0v-120H560v-80h200v200h-80Z"/>
            </svg>
        </button>
        <!-- TODO: disable this button when no hold is selected -->
        <button on:click={deleteSelectedHold} class={selectedHoldi != null ? "delete" : "deemph"}>
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                <path fill="currentcolor" d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
            </svg>
        </button>
        <button on:click={segmentHolds}>segment</button>
    </div>
    {#if wallImgURL}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            id="holdsUI"
            bind:this={holdsOverlay}
            on:pointerdown={(e) => {selectedHold = null; selectedHoldi = null;}}
            on:pointermove={(e) => {if (resizingDir) {handleResizeMouseMove(e);};}}
            on:pointerup={handleResizeEnd}>
            <!-- on:touchend={handleResizeEnd}
            on:mouseup={handleResizeEnd}
            on:touchcancel={handleResizeEnd}
        > -->
            <img bind:this={wallImg} src={wallImgURL} alt="the climbing wall you uploaded"/>
            <canvas bind:this={segmentationCanvas}></canvas>
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="100%" height="100%" overflow="visible">
                {#each holds as hold}
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                    <!-- TODO: improve hold (tab) ordering for accessibility -->
                    <rect
                        width="{hold.right - hold.left}"
                        height="{hold.bottom - hold.top}"
                        tabindex="0"
                        stroke="red"
                        fill="{selectedHold && selectedHold.id == hold.id ? 'rgba(1,0,0,0.0)' : 'rgba(0,0,0,0.0)'}"
                        stroke-width="1"
                        x="{hold.left}"
                        y="{hold.top}"
                        on:click={handleHoldClick}
                        on:keypress={() => handleHoldKeypress(hold)}
                    ></rect>
                {/each}
                {#if selectedHoldi != null && holds[selectedHoldi]}
                    {#each Object.keys(DIRS) as dir}
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <!-- svelte-ignore a11y-no-noninteractive-tabindex -->
                        <circle
                            fill="white"
                            stroke="red"
                            stroke-width="{RESIZE_HANDLE_RADIUS / 5}"
                            r="{RESIZE_HANDLE_RADIUS}"
                            tabindex="0"
                            cx="{holds[selectedHoldi].left * DIRS[dir][0] + holds[selectedHoldi].right * DIRS[dir][2]}"
                            cy="{holds[selectedHoldi].top * DIRS[dir][1] + holds[selectedHoldi].bottom * DIRS[dir][3]}"
                            class="{dir == "top" || dir == "bottom" ? 'draggable draggable-ns' : 'draggable draggable-ew'}"
                            on:pointerdown={(e) => {startHoldResize(e, dir);}}
                            on:touchstart={(e) => {startHoldResize(e, dir);}}
                        ></circle>
                    {/each}
                {/if}
            </svg>
        </div>
    {/if}
</div>
</main>