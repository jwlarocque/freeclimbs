<script lang="ts">
    import { fly } from "svelte/transition";
    import { DropdownMenu } from "bits-ui";
	import type { Hold } from "$lib/Hold";
    import LoadingEllipsis from "$lib/LoadingEllipsis.svelte";
	import SetEditor from "$lib/SetEditor.svelte";

    let editorState;
    let showInfo = false;
    let holds:Hold[];

    $: console.log(holds);
</script>

<style>
    main {
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
    }

    #info {
        position: absolute;
        bottom: 0;
        margin: auto;
        overflow-y: auto;
        margin: var(--inset);
        max-height: calc(100% - 2em);
    }

    #info > header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 1em;
        padding: 0;
        width: 100%;
    }

    #info > *:last-child {
        margin-bottom: 0;
    }

    header > h3 {
        margin: 0;
        font-size: 1.2em;
    }

    header > button {
        margin: 0;
        font-size: 1em;
    }

    p, ul {
        color: var(--color-minor);
    }

    :global(#controls) {
        position: absolute;
        top: 0;
        left: 0;
        margin: var(--inset);
        display: flex;
        flex-direction: column;
        gap: 1em;
    }
</style>

<main>
    <SetEditor bind:autoState={editorState} bind:holds/>
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div id="info" class="sign" role="note">
        <header>
            {#if editorState == "init"}
                <h3>1. Upload a photo of your wall</h3>
            {:else if editorState == "processing"}
                <h3>2. Processing<LoadingEllipsis active={true}/></h3>
            {:else if editorState == "done"}
                <h3>3. Correct mistakes</h3>
            {/if}
            <button  on:click={() => showInfo = !showInfo} on:keypress={() => showInfo = !showInfo} class="buttonLight">{showInfo ? "Hide" : "Show"} tips</button>
        </header>
            {#if showInfo}
            {#if editorState == "init"}
                <ul>
                    <li>Use a good quality, high resolution image.</li>
                    <li>Ensure the wall is brightly and evenly lit; minimize harsh shadows.</li>
                    <li>Remove tape, excess chalk, and other obstructions.</li>
                    <li>If you have holds the same color as the background, the model may have trouble distinguishing them. Good luck lol.</li>
                </ul>
                <p>(If you're not happy with the results, you can refresh the page and try again with a new image.)</p>
            {:else if editorState == "processing"}
                <p>This may take a few minutes, particularly if your wall has a lot of holds.</p>
            {:else if editorState == "done"}
                <p>Review the detected holds and correct any errors. Once you publish the Set you'll no longer be able to make any changes, so take your time.</p>
            {/if}
        {/if}
    </div>
    {#if true || editorState == "done"}
        <DropdownMenu.Root>
            <DropdownMenu.Trigger id="controls">
                test
            </DropdownMenu.Trigger>
        </DropdownMenu.Root>
        <!-- <div id="controls" transition:fly={{x: -50}}>
            <button class="buttonLight">Save Draft</button>
            <button class="buttonLight">Publish</button>
        </div> -->
    {/if}
</main>