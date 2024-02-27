<script lang="ts">
    import createPanZoom from "panzoom";
    import { env, SamModel, AutoProcessor, RawImage, Tensor } from "@xenova/transformers";
    import { cat, stack } from "@xenova/transformers";

    import type { Hold } from "$lib/Hold";
	import Page from "../routes/+page.svelte";
    import SamWorker from "$lib/SamWorker?worker";

    export let wallImgURL;
    export let holds:Hold[];

    $: allHoldsContoured = holds.every((hold) => hold.mask);

    env.allowLocalModels = false;

    const DIRS = {
        "left": [1, 0.5, 0, 0.5],
        "top": [0.5, 1, 0.5, 0],
        "right": [0, 0.5, 1, 0.5],
        "bottom": [0.5, 0, 0.5, 1]
    };
    const RESIZE_HANDLE_RADIUS = 7;

    let numWorkersText = "";

    // TODO: this decodeId system is insane
    // TODO: discard old decodes by id when they're no longer needed
    //       (this may be complicated)
    // TODO: why do I have this weird singleton thing?
    class SamHandler {
        workers: Worker[] = [];
        workersReady: boolean[] = [];
        workersEmbedded: string[] = [];
        decodeId = 0;
        decodeQueue: any[] = [];
        decodesInFlight: number[] = [];

        constructor() {
            // use at least 1 worker
            // use no more than 1 worker per 2GB of memory
            // don't use more than 4 workers
            const memoryWorkerLimit = Math.max(1, Math.floor(Math.min(navigator?.deviceMemory || 2, 8) / 2));
            let numWorkers = Math.min(Math.max(navigator.hardwareConcurrency - 1, 1), memoryWorkerLimit);
            numWorkersText = `${numWorkers} workers`;
            for (let i = 0; i < numWorkers; i++) {
                let worker = new SamWorker();
                worker.onmessage = async (e) => {
                    const {type, data} = e.data;
                    if (type === 'ready') {
                        this.workersReady[i] = true;
                    } else if (type === 'segment_result') {
                        if (data == "start") {
                            this.workersEmbedded[i] = "running";
                        } else if (data == "done") {
                            this.workersEmbedded[i] = "done";
                            this.decodeFromQueue(i);
                        }
                    } else if (type === 'decode_result') {
                        const {decode_id, hold_i, mask, score} = data;
                        let decodeIndex = this.decodesInFlight.indexOf(decode_id);
                        if (decodeIndex != -1) {
                            this.decodesInFlight.splice(decodeIndex, 1);
                            holds[hold_i].mask = mask;
                            // drawMask(hold_i);
                        }
                        this.decodeFromQueue(i);
                    }
                }
                this.workers.push(worker);
                this.workersReady.push(false);
                this.workersEmbedded.push("not_started");
            }
        }

        decodeFromQueue(worker_i) {
            if (this.workersEmbedded[worker_i] == "done"
                && this.decodeQueue.length > 0
            ) {
                let hold_i = this.decodeQueue.shift();
                let thisDecodeId = this.decodeId++;
                this.decodesInFlight.push(thisDecodeId);
                this.workers[worker_i].postMessage({
                    type: 'decode',
                    data: {
                        decode_id: thisDecodeId,
                        bbox: [
                            holds[hold_i].left,
                            holds[hold_i].top,
                            holds[hold_i].right,
                            holds[hold_i].bottom],
                        hold_i: hold_i
                    }
                });
            }
        }

        // for simplicity, just have each worker compute their own embeddings
        // TODO: consider computing embeddings once and passing them to all workers
        segment(imgURL) {
            this.workers.forEach((worker, i) => {
                if (this.workersEmbedded[i] == "not_started") {
                    worker.postMessage({
                        type: 'segment',
                        data: imgURL,
                    });
                }
            });
        }

        decode() {
            this.decodeQueue = [];
            holds.forEach((hold, i) => {
                if (!hold.mask) {
                    this.decodeQueue.push(i);
                }
            });
            this.workers.forEach((worker, i) => {
                this.decodeFromQueue(i);
            });
        }

        decodeOne(hold_i) {
            this.decodeQueue.push(hold_i);
            this.decodeFromQueue(0);
        }
    }

    let samHandler = new SamHandler();

    let holdsOverlayContainer;
    let holdsOverlay;
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
            selectedHoldi = null;
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
        selectedHoldi = holds.findIndex((h) => h?.id != null && h.id == selectedHold.id); // TODO: awk
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
        // TODO: check if size has actually changed
        if (resizingDir && selectedHoldi != null) {
            samHandler.decodeOne(selectedHoldi);
        }
        resizingDir = null;
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
            id: Math.max(...holds.map((h) => h.id)) + 1,
            left: -1/zoom * (panX - containerRect.width * 0.2),
            top: -1/zoom * (panY - containerRect.height * 0.2),
            right: -1/zoom * (panX - containerRect.width * 0.8),
            bottom: -1/zoom * (panY - containerRect.height * 0.8)
        });
        holds = holds;
        selectedHoldi = holds.length - 1;
        selectedHold = holds[holds.length - 1];
        // TODO: segment immediately
    }

    function segmentHolds() {
        if (!wallImgURL) {
            return;
        }
        samHandler.segment(wallImgURL);
        samHandler.decode();
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
        stroke-linejoin: round;
    }

    .contour {
        pointer-events: none;
    }

    .glow {
        opacity: 1;
        animation: reveal 1s ease-in-out forwards;
    }

    /* TODO: find a way to disable this animation when showing all hold contours at once */
    /*       (it lags like crazy with more than a couple hundred holds) */
    /* TODO: keep the base contour (aside from glow) even after glow finishes */

    @keyframes reveal {
        0% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
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
<p>{holds.filter((h) => h.mask).length} / {holds.length} holds segmented</p>
<p>{numWorkersText}</p>
<div id="holdsUIContainer" bind:this={holdsOverlayContainer} on:touchmove={(e) => e.preventDefault()}>
    <div id="controls">
        <!-- TODO: don't propagate pointer events through to the panzoom -->
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
        <!-- TODO: prevent hold outline flicker when selecting holds -->
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <!-- svelte-ignore a11y-click-events-have-key-events -->
        <div
            id="holdsUI"
            bind:this={holdsOverlay}
            on:pointermove={(e) => {if (resizingDir) {handleResizeMouseMove(e);};}}
            on:pointerup={handleResizeEnd}
        >
            <img bind:this={wallImg} src={wallImgURL} alt="the climbing wall you uploaded"/>
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="100%" height="100%" overflow="visible">
                <defs>
                    <filter id="glow" x="-75%" y="-75%" width="300%" height="300%">
                        <feDropShadow dx="0" dy="0" stdDeviation="2" flood-color="#1d85bb"></feDropShadow>
                        <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#1d85bb"></feDropShadow>
                        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#1d85bb"></feDropShadow>
                        <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#1d85bb"></feDropShadow>
                    </filter>
                </defs>
                <!-- <path id="mask-path" class="mask-path" d="" stroke-linecap="round" stroke-linejoin="round" stroke-opacity=".8" fill-opacity="0" stroke="#1d85bb" stroke-width="3" filter="url(#glow)"></path> -->
                <!-- <animate xlink:href="#contourBlur" attributeName="radius" from="4" to="1" dur="1s" begin="0s" repeatCount="indefinite"></animate> -->
                {#each holds as hold, i}
                    {#if hold.mask}
                        {#each hold.mask as maskPoly}
                            <polygon class={!allHoldsContoured || selectedHoldi == i ? "contour glow" : "contour"}
                                points="{maskPoly.map((x, i) => i % 2 === 0 ? `${x},${maskPoly[i + 1]} ` : "").join(' ')}"
                                fill="transparent"
                                stroke="blue"
                                stroke-width="2"
                                filter={!allHoldsContoured || selectedHoldi == i ? "url(#glow)" : ""}
                            ></polygon>
                        {/each}
                        {#if selectedHoldi == i}
                            {#each hold.mask as maskPoly}
                                <polygon class="contour"
                                    points="{maskPoly.map((x, i) => i % 2 === 0 ? `${x},${maskPoly[i + 1]} ` : "").join(' ')}"
                                    fill="transparent"
                                    stroke="blue"
                                    stroke-width="2"
                                ></polygon>
                            {/each}
                        {/if}
                    {/if}
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <rect
                        width="{hold.right - hold.left}"
                        height="{hold.bottom - hold.top}"
                        fill="transparent"
                        stroke="red"
                        stroke-width="1"
                        x="{hold.left}"
                        y="{hold.top}"
                        on:click|stopPropagation={handleHoldClick}
                        on:keypress={() => handleHoldKeypress(hold)}
                        on:pointerup={handleResizeEnd}
                        on:touchend={handleResizeEnd}
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
                            tabindex="-1"
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