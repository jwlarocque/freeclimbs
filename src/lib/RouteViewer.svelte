<script lang="ts">
    // TODO: consider combining this with the SetEditor
    import createPanZoom from "panzoom";

    export let set;
    export let route;
    export let panzoomEnabled = false;

    let imageUrl;
    $: if (set) {
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
    </div>
</div>