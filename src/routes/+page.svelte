<script lang="ts">
    import WallEditor from "$lib/WallEditor.svelte";

    import type {Hold} from "$lib/Hold";

    let wallImgFiles;
    let wallImgURL;
    let holds:Hold[];

    $: if (wallImgFiles) {
        handleWallImgSubmit();
    }

    async function handleWallImgSubmit() {
        holds = [];
        if (wallImgURL) { URL.revokeObjectURL(wallImgURL); }
        wallImgURL = null;
        try {
            let formData = new FormData();
            formData.append("file", wallImgFiles[0])
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
            wallImgURL = URL.createObjectURL(wallImgFiles[0]);
        } catch (error) {
            console.error(error);
        }
    }
</script>

<style>
    :root {
        --color-major: #fdf5ec;
        --color-background: #07200e;
        --color-greeblies: #83817d;
    }

    h1 {
        font-family: "Besley", serif;
        font-weight: bold;
        font-size: min(4em, 10vw);
        color: var(--color-major);
    }

    :global(body) {
        background-color: var(--color-background);
        margin: 2em;
        background-image: url("data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%270%200%202500%202500%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%0A%20%20%20%20%3Cfilter%20id%3D%27noiseFilter%27%3E%0A%20%20%20%20%20%20%3CfeTurbulence%20%0A%20%20%20%20%20%20%20%20type%3D%27fractalNoise%27%20%0A%20%20%20%20%20%20%20%20baseFrequency%3D%270.65%27%20%0A%20%20%20%20%20%20%20%20numOctaves%3D%271%27%20%0A%20%20%20%20%20%20%20%20stitchTiles%3D%27stitch%27%2F%3E%0A%20%20%20%20%3C%2Ffilter%3E%0A%20%20%20%20%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20opacity%3D%270.15%27%20filter%3D%27url%28%23noiseFilter%29%27%2F%3E%0A%3C%2Fsvg%3E");
    }
</style>

<h1>Freeclimbs</h1>


<label for="wallimg">Upload an image of your wall:</label>
<input
    id="wallimg"
    name="wallimg"
    type="file"
    accept="image/png, image/jpeg, image/webp, image/tiff"
    bind:files={wallImgFiles}/>
<!-- <button on:click={handleWallImgSubmit}>Test</button> -->

{#if wallImgURL && holds}
    <WallEditor wallImgURL={wallImgURL} holds={holds}/>
{/if}
