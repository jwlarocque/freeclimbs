<script lang="ts">
    import createPanZoom from "panzoom";
    import { env, SamModel, AutoProcessor, RawImage, Tensor } from "@xenova/transformers";

    import type { Hold } from "$lib/Hold";
	import Page from "../routes/+page.svelte";

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

    let holdsOverlayContainer;
    let holdsOverlay;
    let segmentationCanvas;
    let wallImg;
    let wallImgLoaded = false;
    let panzoom;
    let clickDisabled = false;
    let selectedHold = null;
    let selectedHoldi;
    $: if (holds && selectedHold) {
        selectedHoldi = holds.findIndex((h) => h.id == selectedHold.id); // TODO: awk
    }
    
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
        console.log(candidates);
        selectedHold = candidates[0];
    }

    function handleHoldKeypress(hold) {
        selectedHold = hold;
    }

    let resizingDir;
    function startHoldResize(e, dir) {
        e.preventDefault();
        e.stopPropagation();
        resizingDir = dir;
        resizeHold(e.offsetX, e.offsetY);
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
        selectedHold = holds[holds.length - 1];
    }

    let maskData;
    let scores;
    let imageInputs;
    let imageEmbeddings;
    let model;
    let processor;
    async function segmentHolds() {
        if (!model) {
            model = await SamModel.from_pretrained("Xenova/slimsam-50-uniform");
        }
        if (!processor) {
            processor = await AutoProcessor.from_pretrained("Xenova/slimsam-50-uniform");
        }
        if (!imageEmbeddings) {
            const rawImage = await RawImage.read(wallImgURL);
            imageInputs = await processor(rawImage);
            imageEmbeddings = await model.get_image_embeddings(imageInputs);
        }
        let inputPoints = [];
        for (let i = 0; i < holds.length; i++) {
            let centerX = (holds[i].left + holds[i].right) / 2;
            let centerY = (holds[i].top + holds[i].bottom) / 2;
            inputPoints.push([[centerX, centerY]]);
        }
        const outputs = await model({...imageEmbeddings, input_points: processor.reshape_input_points(inputPoints, imageInputs.original_sizes, imageInputs.reshaped_input_sizes)});
        const masks = await processor.post_process_masks(outputs.pred_masks, imageInputs.original_sizes, imageInputs.reshaped_input_sizes);
        maskData = masks[0];
        scores = outputs.iou_scores.data;
        // drawMasks();
    }

    $: if (selectedHoldi != null && maskData && selectedHoldi < maskData.dims[0]) {
        drawMask(selectedHoldi);
    }

    $: if (selectedHoldi == null && maskData && segmentationCanvas) {
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
        const imageData = ctx.createImageData(segmentationCanvas.width, segmentationCanvas.height);
        let bestMask = maskData[segment_i][0];
        let bestMaski = 0;
        for (let j = 1; j < maskData.dims[1]; j++) {
            if (scores[segment_i][j] > scores[segment_i][bestMaski]) {
                bestMask = maskData[segment_i][j];
                bestMaski = j;
            }
        }
        let mask = bestMask.tolist();
        for (let i = 0; i < imageData.data.length / 4; i += 1) {
            // TODO: this is dumb
            let x = i % segmentationCanvas.width;
            let y = Math.floor(i / segmentationCanvas.width);
            if (x < holds[selectedHoldi].left || x > holds[selectedHoldi].right || y < holds[selectedHoldi].top || y > holds[selectedHoldi].bottom) {
                continue;
            }
            if (mask[y][x] > 0) {
                imageData.data[i * 4 + 0] = 0; // r
                imageData.data[i * 4 + 1] = 121; // g
                imageData.data[i * 4 + 2] = 180; // b
                imageData.data[i * 4 + 3] = 127; // a
            }
        }
        ctx.putImageData(imageData, 0, 0);
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
            on:mousedown={(e) => {selectedHold = null; selectedHoldi = null;}}
            on:pointermove={(e) => {if (resizingDir) {handleResizeMouseMove(e);};}}
            on:mouseup={(e) => {resizingDir = null;}}
            on:touchend={(e) => {resizingDir = null;}}
            on:touchcancel={(e) => {resizingDir = null;}}
        >
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
                        fill="{selectedHold && selectedHold.id == hold.id ? 'rgba(1,0,0,0.3)' : 'rgba(0,0,0,0.0)'}"
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