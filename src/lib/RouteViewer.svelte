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
        width: 100%;
        height: 100%;
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