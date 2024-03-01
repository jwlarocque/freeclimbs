<script lang="ts">
    import LoadingEllipsis from "$lib/LoadingEllipsis.svelte";
    import WallEditor from "$lib/WallEditor.svelte";

    let editorState;
</script>

<style>
    :root {
        --color-major: #fdf5ec;
        --color-minor: rgba(253, 245, 236, 0.9);
        --color-background: #040f07;
        --color-hover-background: #ddd6cf;
        --color-greeblies: #83817d;
        --color-sign: #fff;
    }

    h1 {
        font-family: "Besley", serif;
        font-weight: bold;
        font-size: min(4em, 10vw);
        color: var(--color-major);
    }

    h3 {
        font-family: "Besley", serif;
        font-size: min(1.8em, 8vw);
        color: var(--color-major);
    }

    p, ul {
        color: var(--color-minor);
    }

    :global(body) {
        background-color: var(--color-background);
        margin: 2em;
        background-image: url("data:image/svg+xml;utf8,%3Csvg%20viewBox%3D%270%200%202500%202500%27%20xmlns%3D%27http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%27%3E%0A%20%20%20%20%3Cfilter%20id%3D%27noiseFilter%27%3E%0A%20%20%20%20%20%20%3CfeTurbulence%20%0A%20%20%20%20%20%20%20%20type%3D%27fractalNoise%27%20%0A%20%20%20%20%20%20%20%20baseFrequency%3D%270.65%27%20%0A%20%20%20%20%20%20%20%20numOctaves%3D%271%27%20%0A%20%20%20%20%20%20%20%20stitchTiles%3D%27stitch%27%2F%3E%0A%20%20%20%20%3C%2Ffilter%3E%0A%20%20%20%20%3Crect%20width%3D%27100%25%27%20height%3D%27100%25%27%20opacity%3D%270.15%27%20filter%3D%27url%28%23noiseFilter%29%27%2F%3E%0A%3C%2Fsvg%3E");
    }

    :global(*) {
        font-family: "Libre Baskerville", serif;
    }
</style>

<h1>Freeclimbs</h1>

<WallEditor bind:autoState={editorState}/>


{#if editorState == "init"}
    <h3>1. Upload a photo of your wall</h3>
    <ul>
        <li>Use a good quality, high resolution image.</li>
        <li>Ensure the wall is brightly and evenly lit; minimize harsh shadows.</li>
        <li>Remove tape, excess chalk, and other obstructions.</li>
        <li>If you have holds the same color as the background, the model may have trouble distinguishing them. Good luck lol.</li>
    </ul>
    <p>(If you're not happy with the results, you can refresh the page and try again with a new image.)</p>
{:else if editorState == "processing"}
    <h3>2. Processing<LoadingEllipsis active={true}/></h3>
    <p>This may take a few minutes, particularly if your wall has a lot of holds.</p>
{:else if editorState == "done"}
    <h3>3. Correct mistakes</h3>
    <p>Review the detected holds and correct any errors. Once you publish a wall you can only edit it by creating a new Set, so take your time.</p>
{/if}