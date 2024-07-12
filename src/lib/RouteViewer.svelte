<script lang="ts">
    // TODO: consider combining this with the SetEditor
    // TODO: there's sometimes a non-network delay before the image is painted,
    //       maybe canvas related? Anyways, try to fix.
    import createPanZoom from "panzoom";
	import LoadingEllipsis from "./LoadingEllipsis.svelte";
	import LockedIcon from "./icons/LockedIcon.svelte";
    import UnlockedIcon from "./icons/UnlockedIcon.svelte";
	import RecenterIcon from "./icons/RecenterIcon.svelte";

    export let set;
    // TODO: if route selected, only highlight holds which are part of it
    // TODO: consider adding a dark overlay to the rest of the image
    export let route;
    export let panzoomEnabled = true;
    export let onClick = () => {};

    const CANVAS_SIZE = 2048; // limit canvas size for performance

    // TODO: reorganize variables and reactivity
    let lastSet;
    let imageUrl;
    let setImg;
    let setImgLoaded = false;
    let container;
    let viewer;
    let panzoom;
    let canvas;

    $: if (set) {
        if (lastSet?.id != set?.id) {
            setImgLoaded = false;
        }
        lastSet = set;
        imageUrl = `/api/files/${set.collectionId}/${set.id}/${set.image}`;
    }
    $: if (set && setImgLoaded && (route || !route)) {
        drawSet(set.holds, canvas);
    }
    $: if (viewer) {
        panzoom = createPanZoom(viewer, {
            maxZoom: 10,
            minZoom: 0.05,
            zoomDoubleClickSpeed: 1,
            onTouch: (e) => {return false;}
        });
    }
    $: if (setImg) {
        setImg.onload = () => {
            setImgLoaded = true;
        };
    };
    $: if (setImgLoaded && panzoom) {
        recenter();
    }

    function recenter() {
        panzoom.zoomAbs(0, 0, 1);
        let zoom = Math.min(
            container.clientWidth / setImg.width,
            container.clientHeight / setImg.height);
        panzoom.zoomTo(0, 0, zoom);
        panzoom.moveTo(
            (container.clientWidth - zoom * setImg.width) / 2,
            (container.clientHeight - zoom * setImg.height) / 2);
    }

    function drawSet(holds, canv) {
        let scale = Math.min(
            CANVAS_SIZE / setImg.naturalWidth,
            CANVAS_SIZE / setImg.naturalHeight);
        canv.width = setImg.width * scale;
        canv.height = setImg.height * scale;
        const ctx = canv.getContext("2d");
        ctx.clearRect(0, 0, canv.width, canv.height);
        ctx.beginPath();
        ctx.rect(0, 0, canv.width, canv.height);
        for (let i = 0; i < holds.length; i++) {
            const hold = holds[i];
            if (route && !(
                route.holds?.start?.includes(hold.id)
                || route.holds?.finish?.includes(hold.id)
                || route.holds?.holds?.includes(hold.id)
            )) {
                continue;
            }
            if (hold.contours) {
                for (let j = 0; j < hold.contours.length; j++) {
                    const contourPoly = hold.contours[j];
                    ctx.moveTo(contourPoly[0] * scale, contourPoly[1] * scale);
                    for (let k = 2; k < contourPoly.length; k += 2) {
                        ctx.lineTo(contourPoly[k] * scale, contourPoly[k + 1] * scale);
                    }
                    ctx.lineTo(contourPoly[0] * scale, contourPoly[1] * scale);
                }
            }
        }
        ctx.clip();
        ctx.drawImage(setImg, 0, 0, canv.width, canv.height);
        ctx.fillStyle = "rgba(0, 0, 0, 0.6)";
        ctx.fillRect(0, 0, canv.width, canv.height);
        ctx.strokeStyle = "blue";
        // TODO: make this proportional to median? hold size?
        ctx.lineWidth = 15;
        // TODO: can we do something with this double loop?
        for (let i = 0; i < holds.length; i++) {
            const hold = holds[i];
            if (route) {
                ctx.setLineDash([]);
                if (route.holds?.start?.includes(hold.id)) {
                    ctx.strokeStyle = "green";
                } else if (route.holds?.finish?.includes(hold.id)) {
                    ctx.strokeStyle = "red";
                    ctx.setLineDash([20, 10]);
                } else if (route.holds?.holds?.includes(hold.id)) {
                    ctx.strokeStyle = "blue";
                } else {
                    continue;
                }
            }
            if (hold.contours) {
                for (let j = 0; j < hold.contours.length; j++) {
                    ctx.beginPath();
                    ctx.shadowBlur = 15;
                    ctx.shadowColor = ctx.strokeStyle;
                    const contourPoly = hold.contours[j];
                    ctx.moveTo(contourPoly[0] * scale, contourPoly[1] * scale);
                    for (let k = 2; k < contourPoly.length; k += 2) {
                        ctx.lineTo(contourPoly[k] * scale, contourPoly[k + 1] * scale);
                    }
                    ctx.closePath();
                    ctx.stroke();
                }
            }
        }
    }
</script>

<style>
    #container {
        position: relative;
        max-width: 100%;
        height: 100%;
        background: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 2500 2500' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='0.15' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"), radial-gradient(var(--color-greeblies) 1.5px, rgba(0, 0, 0, 0.1) 1.5px), var(--color-background);
        background-size: 26px 26px;
        border-radius: calc(var(--primary-radius) - 5px);
        overflow: hidden;
    }

    canvas {
        position: absolute;
        top: 0;
        left: 0;
        overflow: visible;
        height: 100%;
    }

    #viewer {
        position: relative;
        overflow: hidden;
        display: inline-block;

    }

    #viewer.invisible {
        visibility: hidden;
    }

    #loadingIndicator {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translateX(-50%) translateY(-50%);
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        z-index: 10;
    }

    #loadingIndicator p {
        color: var(--color-major);
        margin: 0;
    }

    .infoBox {
        position: absolute;
        margin: var(--inset);
        box-shadow: 0 0 3px black;
        background-color: var(--color-major);
        border-radius: var(--secondary-radius);
    }

    #controls {
        position: absolute;
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
</style>

<div
    id="container"
    bind:this={container}
    on:touchmove={(e) => e.preventDefault()}
>
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <!-- svelte-ignore a11y-no-static-element-interactions -->
    <div id="viewer" bind:this={viewer} on:click={onClick}>
        {#if imageUrl}
            <img
                bind:this={setImg}
                src={imageUrl}
                alt="the selected set for this climbing wall"
            />
        {/if}
        <canvas bind:this={canvas}></canvas>
    </div>
    {#if setImgLoaded}
        <div id="controls" class="infoBox">
            <button
                on:click={() => {panzoomEnabled = !panzoomEnabled; if (panzoomEnabled) { panzoom.resume(); } else { panzoom.pause(); }}}
                title="{panzoomEnabled ? "Disable Panning" : "Enable Panning"}"
            >
                {#if panzoomEnabled}
                    <UnlockedIcon/>
                {:else}
                    <LockedIcon/>
                {/if}
            </button>
            <button
                on:click={recenter}
                title="Recenter"
            >
                <RecenterIcon/>
            </button>
        </div>
    {:else}
        <div id="loadingIndicator" class="sign">
            <p>Loading Image<LoadingEllipsis active={true}/></p>
        </div>
    {/if}
</div>