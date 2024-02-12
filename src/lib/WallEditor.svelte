<script lang="ts">
    import createPanZoom from "panzoom";

    import type { Hold } from "$lib/Hold";
	import Page from "../routes/+page.svelte";

    export let wallImgURL;
    export let holds:Hold[];

    const DIRS = {
        "left": [1, 0.5, 0, 0.5],
        "top": [0.5, 1, 0.5, 0],
        "right": [0, 0.5, 1, 0.5],
        "bottom": [0.5, 0, 0.5, 1]
    };

    let holdsOverlay;
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
            if (event.layerY >= hold.top
                && event.layerY <= hold.bottom
                && event.layerX >= hold.left
                && event.layerX <= hold.right
            ){
                candidates.push(hold);
            }
        }
        if (!candidates) {
            selectedHold = null;
        }
        // we could store distances but this is super fast enough
        candidates.sort((a, b) => {
            let adx = ((a.left + a.right) / 2 - event.layerX) ** 2;
            let ady = ((a.top + a.bottom) / 2 - event.layerY) ** 2;
            let bdx = ((b.left + b.right) / 2 - event.layerX) ** 2;
            let bdy = ((b.top + b.bottom) / 2 - event.layerY) ** 2;
            return (adx + ady) - (bdx + bdy);
        });
        selectedHold = candidates[0];
    }

    function handleHoldKeypress(hold) {
        selectedHold = hold;
    }

    let resizingDir;
    let resizeX = 0;
    let resizeY = 0;
    function startHoldResize(e, dir) {
        resizingDir = dir;
        resizeX = e.layerX;
        resizeY = e.layerY;
    }

    function handleResizeMouseMove(e) {
        resizeX = e.layerX;
        resizeY = e.layerY;
        // TODO: very verbose
        if (resizingDir == "left") {
            holds[selectedHoldi].left = Math.min(resizeX, holds[selectedHoldi].right - 5);
        } else if (resizingDir == "top") {
            holds[selectedHoldi].top = Math.min(resizeY, holds[selectedHoldi].bottom - 5);
        } else if (resizingDir == "right") {
            holds[selectedHoldi].right = Math.max(resizeX, holds[selectedHoldi].left + 5);
        } else if (resizingDir == "bottom") {
            holds[selectedHoldi].bottom = Math.max(resizeY, holds[selectedHoldi].top + 5);
        }
    }
</script>


<style>
    #holdsUIContainer {
        max-width: calc(max(94%, 100% - 4em));
        max-height: 94vh;
        overflow: hidden;
        margin: auto;
        box-shadow: inset 0 0 3px;
        border-radius: 10px;
    }

    #holdsUI {
        position: relative;
    }

    #holdsUI > img {
        display: block;
    }

    :global(#holdsUI > svg) {
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
</style>


<div id="holdsUIContainer" on:touchmove={(e) => e.preventDefault()}>
    {#if wallImgURL}
        <!-- svelte-ignore a11y-no-static-element-interactions -->
        <div
            id="holdsUI"
            bind:this={holdsOverlay}
            on:pointermove={(e) => {if (resizingDir) {handleResizeMouseMove(e);}}}
            on:mouseup={(e) => {resizingDir = null;}}
            on:touchend={(e) => {resizingDir = null;}}
            on:touchcancel={(e) => {resizingDir = null;}}
        >
            <img bind:this={wallImg} src={wallImgURL} alt="the climbing wall you uploaded"/>
            <svg xmlns="http://www.w3.org/2000/svg" version="1.1" width="100%" height="100%" overflow="visible">
                {#each holds as hold, i}
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
                {#if selectedHoldi}
                    {#each Object.keys(DIRS) as dir}
                        <!-- svelte-ignore a11y-no-static-element-interactions -->
                        <circle
                            fill="white"
                            stroke="red"
                            stroke-width="1"
                            r="5"
                            cx="{holds[selectedHoldi].left * DIRS[dir][0] + holds[selectedHoldi].right * DIRS[dir][2]}"
                            cy="{holds[selectedHoldi].top * DIRS[dir][1] + holds[selectedHoldi].bottom * DIRS[dir][3]}"
                            class="{dir == "top" || dir == "bottom" ? 'draggable draggable-ns' : 'draggable draggable-ew'}"
                            on:mousedown={(e) => {startHoldResize(e, dir); e.preventDefault(); e.stopPropagation();}}
                            on:touchstart={(e) => {startHoldResize(e, dir); e.preventDefault(); e.stopPropagation();}}
                        ></circle>
                    {/each}
                {/if}
            </svg>
        </div>
    {/if}
</div>
