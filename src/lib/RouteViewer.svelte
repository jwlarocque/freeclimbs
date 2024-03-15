<script lang="ts">
    // TODO: consider combining this with the SetEditor
    import createPanZoom from "panzoom";

    export let set;
    export let route;
    export let panzoomEnabled = false;

    let imageUrl;
    $: if (set) {
        console.log(set);
        imageUrl = `/api/files/${set.collectionId}/${set.id}/${set.image}`;
    }
    let setImg;
    let setImgLoaded = false;
    let container;
    let viewer;
    let panzoom;

    $: if (viewer) {
        panzoom = createPanZoom(viewer, {
            maxZoom: 10,
            minZoom: 0.1,
            zoomDoubleClickSpeed: 1,
            onTouch: (e) => {return false;}
        });
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

    $: if (setImg) {
        setImg.onload = () => {
            setImgLoaded = true;
        };
    };
    $: if (setImgLoaded && panzoom) {
        recenter();
    }
</script>

<style>
    #container {
        max-width: 100%;
        height: 100%;
        background: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 2500 2500' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='0.15' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"), radial-gradient(var(--color-greeblies) 1.5px, rgba(0, 0, 0, 0.1) 1.5px), var(--color-background);
        background-size: 26px 26px;
        overflow: hidden;
    }

    .contours {
        position: absolute;
        top: 0;
        left: 0;
        z-index: 10;
        overflow: visible;
    }

    polygon {
        animation: blink 3s linear infinite;
    }

    @keyframes blink {
        33.33% {
            opacity: 1;
        }
        66.66% {
            opacity: 0;
        }
        100% {
            opacity: 1;
        }
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
        {#if set}
            <svg class="contours" xmlns="http://www.w3.org/2000/svg" version="1.1" width="100%" height="100%">
                <defs>
                    <filter id="glow" x="-75%" y="-75%" width="300%" height="300%">
                        <feDropShadow dx="0" dy="0" stdDeviation="3" flood-color="#1d85bb"></feDropShadow>
                        <feDropShadow dx="0" dy="0" stdDeviation="6" flood-color="#1d85bb"></feDropShadow>
                        <feDropShadow dx="0" dy="0" stdDeviation="9" flood-color="#1d85bb"></feDropShadow>
                        <feDropShadow dx="0" dy="0" stdDeviation="8" flood-color="#1d85bb"></feDropShadow>
                    </filter>
                    <linearGradient id="grad1" x1="100%" y1="0" x2="0" y2="100%" gradientUnits="userSpaceOnUse">
                        <stop offset="0" style="stop-color:rgba(255, 255, 255, 0);" />
                        <stop offset="45%" style="stop-color:rgba(255, 255, 255, 0);" />
                        <stop offset="50%" style="stop-color:rgba(255, 255, 255, 0.5);" />
                        <stop offset="55%" style="stop-color:rgba(255, 255, 255, 0);" />
                        <stop offset="100%" style="stop-color:rgba(255, 255, 255, 0);" />
                        <!-- <animate attributeName="y1" from="100%" to="-100%" dur="3s" repeatCount="indefinite"/>
                        <animate attributeName="y2" from="200%" to="0" dur="3s" repeatCount="indefinite"/> -->
                    </linearGradient>
                </defs>
                {#each (set?.holds || []) as hold}
                    {#if hold?.contours}
                        {#each (hold?.contours || []) as contourPoly}
                            <polygon class={"contour"}
                                points="{contourPoly.map((x, i) => i % 2 === 0 ? `${x},${contourPoly[i + 1]} ` : "").join(' ')}"
                                fill="transparent"
                                stroke="blue"
                                stroke-width="3"
                                x="{hold.left}"
                                y="{hold.top}"
                                stroke-dasharray="4"
                                filter="url(#glow)"
                                style="animation-delay: {(hold?.top + hold?.bottom) / 2000}s"
                            ></polygon>
                        {/each}
                    {/if}
                {/each}
            </svg>
        {/if}
    </div>
</div>