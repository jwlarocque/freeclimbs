<script lang="ts">
    import { Dialog, Separator, Label } from "bits-ui";
	import RadioInput from "$lib/RadioInput.svelte";
	import TextInput from "$lib/TextInput.svelte";
    import { pb } from "$lib/pocketbase";
	import LoadingEllipsis from "$lib/LoadingEllipsis.svelte";

    export let buttonClass;
    export let wallId:string = null;
    export let data = {
        "name": "",
        "public": false,
        "allow_training": false,
        "owner": pb.authStore.model?.id
    };
    export let onUpdate = () => {};
    $: console.log(data);
    let awaitingCreate = false;
    let errorMessage;
    let modalOpen = false;

    $: submitEnabled = (
        data.name.length > 0
        && [true, false].includes(data.public)
        && [true, false].includes(data.allow_training));
    
    async function createUpdateWall() {
        errorMessage = null;
        awaitingCreate = true;
        if (!wallId) {
            try {
                const record = await pb.collection("walls").create(data);
                window.location.href = `/wall/${record.id}`;
            } catch (error) {
                errorMessage = error;
                awaitingCreate = false;
            }
        } else {
            try {
                const record = await pb.collection("walls").update(wallId, data);
                onUpdate();
                awaitingCreate = false;
                modalOpen = false;
            } catch (error) {
                errorMessage = error;
                awaitingCreate = false;
            }
        }
    }
</script>

<style>
    h3 {
        margin: 0 0 1em 0;
    }

    form {
        display: grid;
        max-width: 100%;
        grid-template-columns: 1fr 3fr;
        grid-column-gap: 1em;
        grid-row-gap: 1em;
        align-items: center;
        justify-items: start;
        gap: 1em;
        margin: auto;
        font-size: 1em;
    }

    :global(.modalContent p) {
        font-size: 1.2em;
        color: var(--color-major);
        margin: 0;
    }

    :global(.modalContent p.minor) {
        color: var(--color-minor);
        font-size: 0.9em;
    }

    button {
        display: inline-block;
        color: black;
        background-color: var(--color-major);
    }

    button:disabled {
        background-color: var(--color-hover-background);
        color: var(--color-greeblies);
        cursor: default;
    }
</style>

<Dialog.Root bind:open={modalOpen}>
    <Dialog.Trigger class={buttonClass || "buttonLight"}>
        <!-- TODO: replace with a slot? -->
        <p>{wallId ? "Edit" : "New Wall"}</p>
    </Dialog.Trigger>
    <Dialog.Portal>
        <Dialog.Overlay class="modalOverlay"/>
        <Dialog.Content class="sign modalContent">
            <h3>{wallId ? "Edit" : "New"} Wall</h3>
            <Dialog.Close class="closeContainer">
                <svg class="close" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                    <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
                </svg>
            </Dialog.Close>
            <form>
                <p>Name</p>
                <TextInput bind:value={data.name}/>
                <p>Visibility</p>
                <RadioInput options={[{label: "public", value: true}, {label: "private", value: false}]} bind:value={data.public}/>
                <!-- string booleans are limitation of bits ui (or maybe html idk) -->
                {#if data.public}
                    <br/>
                    <p class="minor">
                        Anyone will be able to view this wall and set routes on it.
                        <br/>
                        You can change this setting at any time.
                    </p>
                {:else}
                    <br/>
                    <p class="minor">
                        This wall will be restricted to people you share a link with. Site admins will still be able to see your wall.
                        <br/>
                        You can change this setting at any time.
                    </p>
                {/if}
                <p>Allow Training</p>
                <RadioInput options={[{label: "yes", value: true}, {label: "no", value: false}]} bind:value={data.allow_training}/>
                <br/>
                <p class="minor">
                    Whether we may use images of this wall to train machine learning models. Datasets containing your images and models we train with them will always be free and public.
                    <br/>
                    You can change this setting at any time, but doing so will only affect future training datasets we create from that point on.
                </p>
                <button class="buttonLight" disabled={!submitEnabled || awaitingCreate} on:click|preventDefault|stopPropagation={createUpdateWall}>
                    {#if wallId}
                        {#if awaitingCreate}
                            Updating<LoadingEllipsis active={true}/>
                        {:else}
                            Update
                        {/if}
                    {:else}
                        {#if awaitingCreate}
                            Creating<LoadingEllipsis active={true}/>
                        {:else}
                            Create
                        {/if}
                    {/if}
                </button>
                {#if errorMessage}
                    <p class="minor">Error: {errorMessage}</p>
                {/if}
            </form>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
