<script lang="ts">
    // TODO: clean up this god component

	import { fade, fly } from "svelte/transition";
    import createPanZoom from "panzoom";

    import type { Hold } from "$lib/Hold";
    import SamWorker from "$lib/SamWorker?worker";
	import { onMount } from "svelte";
	import LoadingEllipsis from "./LoadingEllipsis.svelte";


    export let autoState = "init";
    $: if (autoState == "init" && wallImgURL) {
        autoState = "processing";
    }
    $: if (autoState == "processing" && numHoldsSegmented >= holds.length) {
        autoState = "done";
    }


    const DIRS = {
        "left": [1, 0.5, 0, 0.5],
        "top": [0.5, 1, 0.5, 0],
        "right": [0, 0.5, 1, 0.5],
        "bottom": [0.5, 0, 0.5, 1]
    };
    // TODO: consider tying this to zoom level/making constant relative to window
    let RESIZE_HANDLE_RADIUS = 5;

    let holdsOverlayContainer;
    let holdsOverlay;
    let wallImg;
    let wallImgLoaded = false;
    let selectedHold = null;
    let selectedHoldi = null;

    onMount(() => {
        samHandler = new SamHandler();
        RESIZE_HANDLE_RADIUS = ('ontouchstart' in document.documentElement) ? 10 : 5;
    });


    // == DETECTION ============================================================

    let wallImgFiles:FileList;
    let wallImgURL;
    let holds:Hold[];
    
    // drag and drop
    let draggedOver = false;
    function handleWallImgDrop(e) {
        let files = e.dataTransfer.files;
        if (files.length > 0) {
            handleWallImgSubmit(files);
        }
    }

    $: if (wallImgFiles) {
        handleWallImgSubmit(wallImgFiles);
    }

    function loadExample() {
        // fetch example_holds.json
        fetch("example_holds.json").then((response) => response.json()).then((data) => {
            holds = data["holds"];
            console.log(holds);
            wallImgURL = new URL("example_wall.jpg", document.location.origin).toString();
        });
    }

    async function handleWallImgSubmit(files) {
        console.log(files[0]);
        holds = [];
        if (wallImgURL) { URL.revokeObjectURL(wallImgURL); }
        wallImgURL = null;
        try {
            let formData = new FormData();
            formData.append("file", files[0])
            const response = await fetch("/detect", {
                method: "POST",
                body: formData
            });
            const result = await response.json();
            // TODO: handle error
            for (let i = 0; i < result["confidences"].length; i++) {
                if (result["confidences"][i] < 0.5) { continue; }
                holds.push({
                    id: i,
                    left: result["boxes"][i][0],
                    top: result["boxes"][i][1],
                    right: result["boxes"][i][2],
                    bottom: result["boxes"][i][3],
                    confidence: result["confidences"][i]
                });
            }
            holds.sort((a, b) => a.top - b.top);
            console.log(holds);
            wallImgURL = URL.createObjectURL(files[0]);
        } catch (error) {
            console.error(error);
        }
    }

    // == HOLD SEGMENTATION ====================================================

    let allHoldsContoured = false;

    // NOTE: I got rid of the decode ID system to reduce complexity.
    //       It's not needed because:
    //           1. The user is locked out of making changes (and invalidating
    //              old decode responses) during initial segmentation.
    //           2. Once that's done (all holds have contours), all workers
    //              except the first are terminated, so in-order decoding from
    //              the queue is guaranteed.
    // TODO: why do I have this weird singleton thing?
    let samHandlerWorkersReady = []; // TODO: incredibly, insanely dumb
    let samHandlerWorkersEmbedded = []; // seriously just get rid of this
    $: numWorkersReady = samHandlerWorkersReady.filter(x => x).length;
    $: numWorkersEmbedded = samHandlerWorkersEmbedded.filter(x => x == "done").length;
    $: numHoldsSegmented = holds?.filter((h) => h?.contours).length || 0;
    class SamHandler {
        workers: Worker[] = [];
        workersReady: boolean[] = [];
        workersEmbedded: string[] = [];
        decodeQueue: any[] = [];

        constructor() {
            // use at least 1 worker
            // use no more than 1 worker per 2GB of memory
            // don't use more than 4 workers
            const memoryWorkerLimit = Math.max(1, Math.floor(Math.min(navigator?.deviceMemory || 2, 8) / 2));
            let numWorkers = Math.min(Math.max(navigator.hardwareConcurrency - 1, 1), memoryWorkerLimit);
            for (let i = 0; i < numWorkers; i++) {
                let worker = new SamWorker();
                worker.onmessage = async (e) => {
                    const {type, data} = e.data;
                    if (type === 'ready') {
                        this.workersReady[i] = true;
                        samHandlerWorkersReady[i] = true;
                    } else if (type === 'segment_result') {
                        if (data == "start") {
                            this.workersEmbedded[i] = "running";
                            samHandlerWorkersEmbedded[i] = "running";
                        } else if (data == "done") {
                            this.workersEmbedded[i] = "done";
                            samHandlerWorkersEmbedded[i] = "done";
                            this.decodeFromQueue(i);
                        }
                    } else if (type === 'decode_result') {
                        let {hold_id, hold_i, contours, score} = data;
                        if (holds[hold_i].id != hold_id) {
                            hold_i = holds.findIndex((h) => h.id == data.hold_id);
                        }
                        if (hold_i >= 0) {
                            holds[hold_i].contours = contours;
                            // reactivity workaround, not sure why this is necessary
                            selectedHoldi = selectedHoldi;
                            if (holds.every((hold) => hold.contours)) {
                                allHoldsContoured = true;
                                this.cullWorkers();
                                // TODO: allow pointer events on the UI (also disallow when started)
                            }
                        }
                        this.decodeFromQueue(i);
                    }
                }
                this.workers.push(worker);
                this.workersReady.push(false);
                samHandlerWorkersReady.push(false);
                this.workersEmbedded.push("not_started");
                samHandlerWorkersEmbedded.push("not_started");
            }
        }

        decodeFromQueue(worker_i) {
            if (this.workersEmbedded[worker_i] == "done"
                && this.decodeQueue.length > 0
            ) {
                let hold_i = this.decodeQueue.shift();
                this.workers[worker_i].postMessage({
                    type: 'decode',
                    data: {
                        hold_id: holds[hold_i].id,
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
                if (!hold.contours) {
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

        cullWorkers() {
            for (let i = 1; i < this.workers.length; i++) {
                this.workers[i].terminate();
            }
            this.workers = [this.workers[0]];
            this.workersReady = [this.workersReady[0]];
            this.workersEmbedded = [this.workersEmbedded[0]];
        }
    }

    let samHandler;


    // == PANZOOM ==============================================================

    let panzoom;
    $: if (holdsOverlay) {
        panzoom = createPanZoom(holdsOverlay, {
            maxZoom: 10,
            minZoom: 0.1,
            zoomDoubleClickSpeed: 1,
            onTouch: (e) => {return false;}
        });
    }

    function recenter() {
        panzoom.zoomAbs(0, 0, 1);
        let zoom = Math.min(
            holdsOverlayContainer.clientWidth / wallImg.width,
            holdsOverlayContainer.clientHeight / wallImg.height);
        panzoom.zoomTo(0, 0, zoom);
        panzoom.moveTo(
            (holdsOverlayContainer.clientWidth - zoom * wallImg.naturalWidth) / 2,
            (holdsOverlayContainer.clientHeight - zoom * wallImg.naturalHeight) / 2);
    }
   
    // TODO: do all this as part of image load function instead of reactively
    $: if (wallImgLoaded && panzoom) {
        recenter();
        segmentHolds();
    }
    $: if (wallImg) {
        wallImg.onload = () => {
            wallImgLoaded = true;
        };
    };
    function segmentHolds() {
        if (!wallImgURL) {
            return;
        }
        samHandler.segment(wallImgURL);
        samHandler.decode();
    }


    // == EDITOR ===============================================================

    function handleHoldClick(event) {
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
        selectedHold = candidates[0];
        selectedHoldi = holds.findIndex((h) => h?.id != null && h.id == selectedHold.id); // TODO: awk
    }

    function handleHoldKeypress(hold) {
        selectedHold = hold;
        selectedHoldi = holds.findIndex((h) => h?.id != null && h.id == selectedHold.id); // TODO: awk
    }

    // bbox resizing
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

    function getViewRect(size=0.6) {
        if (!(holdsOverlay && holdsOverlayContainer)) {
            return;
        }
        let insetStart = (1 - size) / 2;
        let insetEnd = 1 - insetStart;
        let containerRect = holdsOverlayContainer.getBoundingClientRect();
        let transform = panzoom.getTransform()
        let zoom = transform.scale;
        let panX = transform.x;
        let panY = transform.y;
        return {
            left: -1/zoom * (panX - containerRect.width * insetStart),
            top: -1/zoom * (panY - containerRect.height * insetStart),
            right: -1/zoom * (panX - containerRect.width * insetEnd),
            bottom: -1/zoom * (panY - containerRect.height * insetEnd)
        }
    }

    let bboxPreview;
    function previewAddHold() {
        bboxPreview = getViewRect(0.6);
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
        selectedHold = holds[holds.length - 1];
        selectedHoldi = holds.length - 1;
        samHandler.decodeOne(selectedHoldi);
    }
</script>


<style>
    main {
        width: 100%;
        height: 70vh;
        margin: auto;
        position: relative;
        overflow: hidden;
        border-radius: 10px;
        background-image: radial-gradient(var(--color-greeblies) 1.5px, rgba(0, 0, 0, 0.1) 1.5px);
        background-size: 26px 26px;
    }

    main:after {
        content: "";
        box-shadow: inset 0 0 5px;
        height: 100%;
        position: absolute;
        width: 100%;
        left: 0px;
        top: 0px;
        pointer-events: none;
    }

    .disabled {
        pointer-events: none;
    }

    svg.deemph {
        color: #a8a5a4;
        stroke: #a8a5a4;
        fill: #e4dfdb;
        font-size: 0.8em;
    }

    .button {
        background-color: transparent;
        border: none;
        cursor: pointer;
        font-size: 1em;
        padding: 0.5em;
        /* border: 1px solid var(--color-background); */
        border-radius: 10px;
    }

    .button:hover {
        background-color: var(--color-hover-background);
    }

    #holdsUIContainer {
        position: relative;
        height: 100%;
        width: 100%;
    }

    #holdsUI {
        position: relative;
        display: inline-block;
    }

    #holdsUI > img {
        display: block;
        box-shadow: 0 0 5px black;
    }

    #holdsUI > svg {
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
        animation: reveal 2s ease-in-out forwards;
    }

    @keyframes reveal {
        0% {
            opacity: 1;
        }
        100% {
            opacity: 0;
        }
    }

    .draggable-ew {
        cursor: ew-resize
    }

    .draggable-ns {
        cursor: ns-resize;
    }

    .infoBox {
        position: absolute;
        margin: 0.5em;
        box-shadow: 0 0 3px black;
        background-color: white;
        border-radius: 10px;
    }

    #uploadPromptContainer {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    #uploadPrompt {
        padding: 1em;
        max-width: 90%;
        max-height: 90%;
        width: 40em;
        height: 20em;

        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    #controls {
        top: 0;
        right: 0;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        overflow: hidden;
        line-height: 0;
    }

    #controls button {
        border: none;
        background-color: transparent;
        cursor: pointer;
        padding: 1em;
    }

    #controls button:hover:not(.deemph) {
        background-color: var(--color-hover-background);
    }

    button.delete {
        color: rgb(194, 15, 15);
    }

    #controls button.deemph {
        color: #918c8a;
        cursor: default;
    }

    #processStatus {
        padding: 0.3em;
        bottom: 0;
        right: 0;
    }

    @keyframes -global-rotate {
        0% {
            transform: rotate(0deg) translate(50%);
        }
        100% {
            transform: rotate(1turn) translate(50%);
        }
    }

    #processStatus p {
        margin: 0.2em;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        gap: 1.5em;
    }
</style>

<main>
    {#if wallImgURL}
        <div id="holdsUIContainer" class={allHoldsContoured ? "" : "disabled"} bind:this={holdsOverlayContainer} on:touchmove={(e) => e.preventDefault()}>
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
                    {#each holds as hold, i}
                        {#if hold.contours}
                            {#each hold.contours as contourPoly}
                                <polygon class={!allHoldsContoured || selectedHoldi == i ? "contour glow" : "contour"}
                                    points="{contourPoly.map((x, i) => i % 2 === 0 ? `${x},${contourPoly[i + 1]} ` : "").join(' ')}"
                                    fill="transparent"
                                    stroke="blue"
                                    stroke-width="2"
                                    filter={!allHoldsContoured || selectedHoldi == i ? "url(#glow)" : ""}
                                ></polygon>
                            {/each}
                            {#if selectedHoldi == i}
                                {#each hold.contours as contourPoly}
                                    <polygon class="contour"
                                        points="{contourPoly.map((x, i) => i % 2 === 0 ? `${x},${contourPoly[i + 1]} ` : "").join(' ')}"
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
                    {#if bboxPreview}
                        <rect
                            width="{bboxPreview.right - bboxPreview.left}"
                            height="{bboxPreview.bottom - bboxPreview.top}"
                            fill="transparent"
                            stroke="red"
                            stroke-width="2"
                            x="{bboxPreview.left}"
                            y="{bboxPreview.top}"
                            stroke-dasharray="4"
                        ></rect>
                    {/if}
                </svg>
            </div>
        </div>
        {#if samHandler && holds}
            {#if samHandler?.workers?.length != null && !holds.every((hold) => hold.contours)}
                <div id="processStatus" class="infoBox" transition:fly={{x: 50}}>
                    <p>
                        <span>Creating workers<LoadingEllipsis active={numWorkersReady < samHandler.workers.length}/> </span>
                        <span>{numWorkersReady} / {samHandler.workers.length}</span>
                    </p>
                    <p>
                        <span>Encoding image<LoadingEllipsis active={(numWorkersReady > 0) && (numWorkersEmbedded < samHandler.workers.length)}/> </span>
                        <span>{numWorkersEmbedded} / {samHandler.workers.length}</span>
                    </p>
                    <p>
                        <span>Segmenting holds<LoadingEllipsis active={numWorkersEmbedded > 0 && numHoldsSegmented < holds.length}/> </span>
                        <span style="min-width:5em;text-align:end;">{numHoldsSegmented} / {holds.length}</span>
                    </p>
                </div>
            {:else}
                <div id="controls" class="infoBox" transition:fly={{x: 50}}>
                    <button on:click={deleteSelectedHold} class={selectedHoldi != null ? "delete" : "deemph"} title="delete hold">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                            <path fill="currentcolor" d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z"/>
                        </svg>
                    </button>
                    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
                    <button on:click={addHold} on:mouseover={previewAddHold} on:mouseleave={() => bboxPreview = null} title="add hold">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                            <path d="M680-80v-120H560v-80h120v-120h80v120h120v80H760v120h-80ZM200-200v-200h80v120h120v80H200Zm0-360v-200h200v80H280v120h-80Zm480 0v-120H560v-80h200v200h-80Z"/>
                        </svg>
                    </button>
                    <button on:click={recenter} title="recenter">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                            <path d="M440-42v-80q-125-14-214.5-103.5T122-440H42v-80h80q14-125 103.5-214.5T440-838v-80h80v80q125 14 214.5 103.5T838-520h80v80h-80q-14 125-103.5 214.5T520-122v80h-80Zm40-158q116 0 198-82t82-198q0-116-82-198t-198-82q-116 0-198 82t-82 198q0 116 82 198t198 82Zm0-120q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T560-480q0-33-23.5-56.5T480-560q-33 0-56.5 23.5T400-480q0 33 23.5 56.5T480-400Zm0-80Z"/>
                        </svg>
                    </button>
                </div>
            {/if}
        {/if}
    {:else}
        <div id="uploadPromptContainer">
            <form id="uploadPrompt" class="infoBox"
                on:drop|preventDefault|stopPropagation={handleWallImgDrop}
                on:dragover|preventDefault|stopPropagation={() => draggedOver = true}
                on:dragenter|preventDefault|stopPropagation={() => draggedOver = true}
                on:dragleave|preventDefault|stopPropagation={() => draggedOver = false}
                on:dragend|preventDefault|stopPropagation={() => draggedOver = false}
            >
            <svg xmlns="http://www.w3.org/2000/svg" height="96" viewBox="0 -960 960 960" width="96" class="deemph">
                <path d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                <feComposite operator="in" in2="SourceGraphic"/>
            </svg>
                <p>
                    <label for="wallimg" class="button">Upload a Photo</label>
                    <input
                        id="wallimg"
                        name="wallimg"
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/tiff"
                        style="display: none;"
                        bind:files={wallImgFiles}/>
                    or
                    <button class="button" on:click|preventDefault|stopPropagation={loadExample}>Try Example</button>
                </p>
        </form>
        </div>
    {/if}
</main>
