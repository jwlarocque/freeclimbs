<script lang="ts">
    import { loadSet, pb } from "$lib/pocketbase";
	import type { Hold } from "$lib/Hold";
    import LoadingEllipsis from "$lib/LoadingEllipsis.svelte";
	import SetEditor from "$lib/SetEditor.svelte";
    import TextInput from "$lib/TextInput.svelte";
	import { page } from "$app/stores";
	import { onMount } from "svelte";

    export let data;

    let demo:boolean = data.slug == "demo";
    let editorState;
    let showInfo = false;
    let holds:Hold[];
    let setImgUrl:FileList|string; // TODO: fix type
    let setName = "";
    let setId;
    let saving = false;
    let publishing = false;

    onMount(() => {
        loadExistingSet();
    });

    async function fileFromUrl(url) {
        if (!url) {
            return null;
        }
        const response = await fetch(url);
        const blob = await response.blob();
        return new File([blob], url.split("/").pop(), {type: blob.type});
    }

    async function loadExistingSet() {
        let set;
        if (!$page.url.searchParams.get("set")) {
            return;
        }
        set = await loadSet($page.url.searchParams.get("set"));
        if (set) {
            setName = set.name;
            setId = set.id;
            console.log(set.image);
            holds = set.holds;
            setImgUrl = `/api/files/${set.collectionId}/${set.id}/${set.image}`;
        }
    }

    async function saveSet(draft=true) {
        if (draft) {
            saving = true;
        } else {
            publishing = true;
        }
        try {
            if (!setId) {
                const record = await pb.collection("sets").create({
                    "wall": data.slug,
                    "name": setName,
                    "image": await fileFromUrl(setImgUrl),
                    "holds": holds,
                    "draft": draft
                });
                setId = record.id;
            } else {
                await pb.collection("sets").update(setId, {
                    "name": setName,
                    "holds": holds,
                    "draft": draft
                });
            }
            if (!draft) {
                window.location.href = `/wall/${data.slug}?set=${setId}`; 
            }
        } catch (error) {
            // TODO: nicer error
            alert(error);
            console.error(error);
        } finally {
            if (draft) {
                saving = false;
            } else {
                publishing = false;
            }
        }
    }
</script>

<style>
    main {
        position: relative;
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 0;
        background-color: var(--color-major);
        gap: 5px;
    }

    :global(#nameInput > *) {
        background-color: var(--color-major);
        border: 1px solid var(--color-minor);
    }

    #info {
        position: absolute;
        bottom: 0;
        margin: auto;
        overflow-y: auto;
        margin: var(--inset);
        max-height: calc(100% - 2em);
        border-radius: calc(var(--primary-radius) - 10px);
    }

    #info > header {
        display: flex;
        flex-direction: row;
        justify-content: center;
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

    #controls {
        margin: var(--inset);
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        align-items: center;
        gap: 1em;
        margin: 0;
        width: 100%;
        color: black;
    }

    #controls button {
        display: flex;
        flex-direction: row;
    }

    #nameInput {
        flex: 1 1 auto;
        display: flex;
        flex-direction: row;
        gap: 1em;
        margin: 0;
    }
</style>

<svelte:head>
    <title>
        Freeclimbs | Edit Set
    </title>
</svelte:head>
<main class="sign">
    {#if true || editorState == "done"}
        <div id="controls">
            <div id="nameInput">
                <TextInput bind:value={setName} placeholder={"Set Name"} />
            </div>
            <!-- TODO: we might need some more disable conditions here -->
            <button
                on:click={() => saveSet(true)}
                class={saving || publishing || demo ? "buttonDark disabled" : "buttonDark"}
            >
                {#if saving}
                    Saving<LoadingEllipsis active={true}/>
                {:else}
                    Save Draft
                {/if}
            </button>
            <button
                on:click={() => saveSet(false)}
                class={saving || publishing || demo ? "buttonDark disabled" : "buttonDark"}
            >
                {#if publishing}
                    Publishing<LoadingEllipsis active={true}/>
                {:else}
                    Publish
                {/if}
            </button>
        </div>
    {/if}
    <SetEditor bind:autoState={editorState} bind:holds bind:wallImgURL={setImgUrl}/>
    <!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
    <div id="info" class="sign" role="note">
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
    </div>
</main>