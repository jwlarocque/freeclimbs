<script lang="ts">
    // TODO: consider combining this with the SetEditor
    // TODO: there's sometimes a non-network delay before the image is painted,
    //       maybe canvas related? Anyways, try to fix.
    import createPanZoom from "panzoom";
	import LoadingEllipsis from "./LoadingEllipsis.svelte";

    export let set;
    // TODO: if route selected, only highlight holds which are part of it
    // TODO: consider adding a dark overlay to the rest of the image
    export let route;
    export let panzoomEnabled = false;

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
    $: if (set && setImgLoaded) {
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
        canv.width = setImg.width;
        canv.height = setImg.height;
        const ctx = canv.getContext("2d");
        ctx.beginPath();
        ctx.rect(0, 0, canv.width, canv.height);
        for (let i = 0; i < holds.length; i++) {
            const hold = holds[i];
            if (hold.contours) {
                for (let j = 0; j < hold.contours.length; j++) {
                    const contourPoly = hold.contours[j];
                    ctx.moveTo(contourPoly[0], contourPoly[1]);
                    for (let k = 2; k < contourPoly.length; k += 2) {
                        ctx.lineTo(contourPoly[k], contourPoly[k + 1]);
                    }
                    ctx.lineTo(contourPoly[0], contourPoly[1]);
                }
            }
        }
        ctx.clip();
        ctx.drawImage(setImg, 0, 0);
        ctx.strokeStyle = "blue";
        ctx.lineWidth = 10;
        for (let i = 0; i < holds.length; i++) {
            const hold = holds[i];
            if (hold.contours) {
                for (let j = 0; j < hold.contours.length; j++) {
                    ctx.beginPath();
                    ctx.shadowBlur = 10;
                    ctx.shadowColor = "rgba(0, 0, 255, 1)";
                    const contourPoly = hold.contours[j];
                    ctx.moveTo(contourPoly[0], contourPoly[1]);
                    for (let k = 2; k < contourPoly.length; k += 2) {
                        ctx.lineTo(contourPoly[k], contourPoly[k + 1]);
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
    }

    #viewer {
        position: relative;
        overflow: hidden;
        display: inline-block;

    }

    #viewer.invisible {
        visibility: hidden;
    }

    #glint {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        opacity: 0.6;
        background: linear-gradient(15deg, rgba(255,255,255,0) 45%, rgba(255,255,255,1) 50%, rgba(255,255,255,0) 55%);
        animation: glint 3s linear infinite;
    }

    @keyframes glint {
        0% {
            transform: translate(0, 100%);
        }
        100% {
            transform: translate(0, -100%);
        }
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
</style>

<div
    id="container"
    class={panzoomEnabled ? "" : "disabled"}
    bind:this={container}
    on:touchmove={(e) => e.preventDefault()}
>
    <div id="viewer" bind:this={viewer}>
        {#if imageUrl}
            <img
                bind:this={setImg}
                src={imageUrl}
                alt="the selected set for this climbing wall"
            />
        {/if}
        <div id="glint"></div>
        <canvas bind:this={canvas}></canvas>
    </div>
    {#if !setImgLoaded}
        <div id="loadingIndicator" class="sign">
            <p>Loading Image<LoadingEllipsis active={true}/></p>
        </div>
    {/if}
</div>