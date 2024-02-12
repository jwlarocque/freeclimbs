<script lang="ts">
    import WallEditor from "$lib/WallEditor.svelte";

    import type {Hold} from "$lib/Hold";

    let wallImgFiles;
    let wallImgURL;
    let holds:Hold[];

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
            for (let i = 0; i < result["confidences"].length; i++) {
                holds.push({
                    id: String(i),
                    left: result["boxes"][i][0],
                    top: result["boxes"][i][1],
                    right: result["boxes"][i][2],
                    bottom: result["boxes"][i][3],
                    confidence: result["confidences"][i]
                });
            }
            wallImgURL = URL.createObjectURL(wallImgFiles[0]);
        } catch (error) {
            console.error(error);
        }
    }
</script>

<style>
    
</style>

<h1>Freeclimbs Wall Setup Test</h1>


<label for="wallimg">Upload an image of your wall:</label>
<input
    id="wallimg"
    name="wallimg"
    type="file"
    accept="image/png, image/jpeg, image/webp, image/tiff"
    bind:files={wallImgFiles}/>
<button on:click={handleWallImgSubmit}>Test</button>

{#if wallImgURL && holds}
    <WallEditor wallImgURL={wallImgURL} holds={holds}/>
{/if}