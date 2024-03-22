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
    export let panzoomEnabled = true;
    export let onClick = () => {};

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
        console.log(route);
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
        <div id="glint"></div>
        <canvas bind:this={canvas}></canvas>
    </div>
    {#if setImgLoaded}
        <div id="controls" class="infoBox">
            <button
                on:click={() => {panzoomEnabled = !panzoomEnabled; if (panzoomEnabled) { panzoom.resume(); } else { panzoom.pause(); }}}
                title="{panzoomEnabled ? "Disable Panning" : "Enable Panning"}"
            >
                {#if panzoomEnabled}
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                        <path d="M240-160h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM240-160v-400 400Zm0 80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h280v-80q0-83 58.5-141.5T720-920q83 0 141.5 58.5T920-720h-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80h120q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Z"/>
                    </svg>
                {:else}
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                        <path d="M240-80q-33 0-56.5-23.5T160-160v-400q0-33 23.5-56.5T240-640h40v-80q0-83 58.5-141.5T480-920q83 0 141.5 58.5T680-720v80h40q33 0 56.5 23.5T800-560v400q0 33-23.5 56.5T720-80H240Zm0-80h480v-400H240v400Zm240-120q33 0 56.5-23.5T560-360q0-33-23.5-56.5T480-440q-33 0-56.5 23.5T400-360q0 33 23.5 56.5T480-280ZM360-640h240v-80q0-50-35-85t-85-35q-50 0-85 35t-35 85v80ZM240-160v-400 400Z"/>
                    </svg>
                {/if}
            </button>
            <button
                on:click={recenter}
                title="Recenter"
            >
                <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                    <path d="M440-42v-80q-125-14-214.5-103.5T122-440H42v-80h80q14-125 103.5-214.5T440-838v-80h80v80q125 14 214.5 103.5T838-520h80v80h-80q-14 125-103.5 214.5T520-122v80h-80Zm40-158q116 0 198-82t82-198q0-116-82-198t-198-82q-116 0-198 82t-82 198q0 116 82 198t198 82Zm0-120q-66 0-113-47t-47-113q0-66 47-113t113-47q66 0 113 47t47 113q0 66-47 113t-113 47Zm0-80q33 0 56.5-23.5T560-480q0-33-23.5-56.5T480-560q-33 0-56.5 23.5T400-480q0 33 23.5 56.5T480-400Zm0-80Z"/>
                </svg>
            </button>
        </div>
    {:else}
        <div id="loadingIndicator" class="sign">
            <p>Loading Image<LoadingEllipsis active={true}/></p>
        </div>
    {/if}
</div>