<script lang="ts">
    // TODO: clean up this god component
    // TODO: figure out why delete button is deemph after adding a hold

	import { fade, fly } from "svelte/transition";
    import createPanZoom from "panzoom";

    import type { Hold } from "$lib/Hold";
    import SamWorker from "$lib/SamWorker?worker";
	import { onMount } from "svelte";
	import LoadingEllipsis from "./LoadingEllipsis.svelte";
	import RecenterIcon from "./icons/RecenterIcon.svelte";
	import DeleteIcon from "./icons/DeleteIcon.svelte";
	import AddHoldIcon from "./icons/AddHoldIcon.svelte";


    export let autoState = "init";
    $: if (autoState == "init" && wallImgURL) {
        autoState = "processing";
    }
    $: if (autoState == "processing" && samHandlerWorkersEmbedded.every((x) => x == "done") && numHoldsSegmented >= holds.length) {
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

    let detecting = false;
    let detectionError = null;
    let wallImgFiles:FileList;
    export let wallImgURL;
    export let holds:Hold[];
    
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
        detecting = true;
        // TODO: handle error
        fetch("/example_holds.json").then((response) => response.json()).then((data) => {
            holds = data["holds"];
            console.log(holds);
            wallImgURL = new URL("/example_wall.jpg", document.location.origin).toString();
            detecting = false;
        });
    }

    async function handleWallImgSubmit(files) {
        detecting = true;
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
            detecting = false;
        } catch (error) {
            detectionError = error;
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
            const memoryWorkerLimit = Math.max(1, Math.floor(Math.min(navigator?.deviceMemory || 4, 8) / 4));
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
                            this.workersEmbedded = this.workersEmbedded;
                            samHandlerWorkersEmbedded[i] = "running";
                        } else if (data == "done") {
                            this.workersEmbedded[i] = "done";
                            this.workersEmbedded = this.workersEmbedded;
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
                            this.checkHoldsContoured();
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

        checkHoldsContoured() {
            if (holds && holds.every((hold) => hold?.contours)) {
                allHoldsContoured = true;
                this.cullWorkers();
                // TODO: allow pointer events on the UI (also disallow when started)
                return true;
            }
            return false;
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
            this.checkHoldsContoured();
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
                samHandlerWorkersEmbedded.splice(i, 1);
                samHandlerWorkersReady.splice(i, 1);
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

    // TODO: import from lib
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
        height: 100%;
        position: relative;
        overflow: hidden;
        border-radius: calc(var(--primary-radius) - 5px);
        background: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 2500 2500' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='0.15' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"), radial-gradient(var(--color-greeblies) 1.5px, rgba(0, 0, 0, 0.1) 1.5px), var(--color-background);
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
        border-radius: calc(var(--primary-radius) - 5px);
    }

    svg.deemph {
        color: #a8a5a4;
        stroke: #a8a5a4;
        fill: #e4dfdb;
        font-size: 0.8em;
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

    /* TODO: use sign styling? */
    .infoBox {
        position: absolute;
        margin: var(--inset);
        box-shadow: 0 0 3px black;
        background-color: var(--color-major);
        border-radius: var(--secondary-radius);
    }

    .infoBoxContainer {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    #uploadPrompt {
        box-sizing: border-box;
        padding: 1em;
        max-width: calc(100% - 10px);
        max-height: 90%;
        width: 40em;
        height: 20em;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    #uploadOptions {
        display: grid;
        grid-template-columns: 1fr 0fr 1fr;
        align-items: baseline;
        gap: 1em;
    }

    #uploadOptions > *:first-child {
        margin-left: auto;
        margin-right: 0;
    }

    #uploadOptions > *:last-child {
        margin-left: 0;
        margin-right: auto;
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
        padding: 0.8em;
        line-height: 0;
        border-radius: 0;
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
        padding: 0.6em;
        top: 0;
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
                    <!-- draw preview first so in case of bug it's on bottom -->
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
        </div>
        {#if samHandler && holds}
            {#if samHandler?.workers?.length != null && (!samHandlerWorkersEmbedded.every((x) => x == "done") || !holds.every((hold) => hold.contours))}
                <div id="processStatus" class="infoBox" transition:fly={{x: 50}}>
                    <p>
                        <span>Creating workers<LoadingEllipsis active={numWorkersReady < samHandler.workers.length}/> </span>
                        <span>{numWorkersReady} / {samHandlerWorkersReady.length}</span>
                    </p>
                    <p>
                        <span>Encoding image<LoadingEllipsis active={(numWorkersReady > 0) && (numWorkersEmbedded < samHandler.workers.length)}/> </span>
                        <span>{numWorkersEmbedded} / {samHandlerWorkersEmbedded.length}</span>
                    </p>
                    <p>
                        <span>Segmenting holds<LoadingEllipsis active={numWorkersEmbedded > 0 && numHoldsSegmented < holds.length}/> </span>
                        <span style="min-width:5em;text-align:end;">{numHoldsSegmented} / {holds.length}</span>
                    </p>
                </div>
            {:else}
                <div id="controls" class="infoBox" transition:fly={{x: 50}}>
                    <button on:click={deleteSelectedHold} class={selectedHoldi != null ? "delete" : "deemph"} title="delete hold">
                        <DeleteIcon/>
                    </button>
                    <!-- svelte-ignore a11y-mouse-events-have-key-events -->
                    <button on:click={addHold} on:pointerover={previewAddHold} on:pointerleave={() => bboxPreview = null} title="add hold">
                        <AddHoldIcon/>
                    </button>
                    <button on:click={recenter} title="recenter">
                        <RecenterIcon/>
                    </button>
                </div>
            {/if}
        {/if}
    {:else}
        <div class="infoBoxContainer">
            <form id="uploadPrompt" class="infoBox"
                style={detecting ? "pointer-events: none;" : ""}
                on:drop|preventDefault|stopPropagation={handleWallImgDrop}
                on:dragover|preventDefault|stopPropagation={() => draggedOver = true}
                on:dragenter|preventDefault|stopPropagation={() => draggedOver = true}
                on:dragleave|preventDefault|stopPropagation={() => draggedOver = false}
                on:dragend|preventDefault|stopPropagation={() => draggedOver = false}
            >
                {#if detecting}
                    {#if detectionError}
                        <p>An Error Occured</p>
                    {:else}
                        <p>Detecting Holds<LoadingEllipsis active={true}/></p>
                    {/if}
                {:else}
                <svg xmlns="http://www.w3.org/2000/svg" height="96" viewBox="0 -960 960 960" width="96" class="deemph">
                    <path d="M440-320v-326L336-542l-56-58 200-200 200 200-56 58-104-104v326h-80ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z"/>
                    <feComposite operator="in" in2="SourceGraphic"/>
                </svg>
                <div id="uploadOptions">
                    <label for="wallimg" class="buttonish buttonDark"><p>Upload Image</p></label>
                    <input
                        id="wallimg"
                        name="wallimg"
                        type="file"
                        accept="image/png, image/jpeg, image/webp, image/tiff"
                        style="display: none;"
                        bind:files={wallImgFiles}/>
                    <p>or</p>
                    <button class="buttonish buttonDark" on:click|preventDefault|stopPropagation={loadExample}><p>Try Example</p></button>
                </div>
                {/if}
            </form>
        </div>
    {/if}
</main>
