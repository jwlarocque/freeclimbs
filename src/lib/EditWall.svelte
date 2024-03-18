<script lang="ts">
	import ConfirmModal from "./ConfirmModal.svelte";
	import LoadingEllipsis from "./LoadingEllipsis.svelte";
	import RadioInput from "./RadioInput.svelte";
	import TextInput from "./TextInput.svelte";
	import { pb } from "./pocketbase";

    export let wall;
    export let onUpdate = () => {};

    let awaitingSave = false;
    let submitEnabled = (
        wall.name.length > 0
        && [true, false].includes(wall.public)
        && [true, false].includes(wall.allow_training));
    let errorMessage;

    async function createUpdateWall() {
        errorMessage = null;
        awaitingSave = true;
        try {
            const record = await pb.collection("walls").update(wall.id, wall);
            onUpdate();
            awaitingSave = false;
        } catch (error) {
            errorMessage = error;
            awaitingSave = false;
        }
    }
</script>

<style>
    form {
        display: grid;
        max-width: 100%;
        grid-template-columns: 1fr 3fr;
        grid-column-gap: 1em;
        grid-row-gap: 1em;
        align-items: center;
        justify-items: start;
        gap: 1em;
        padding: 1em;
        margin: auto;
        font-size: 1em;
    }

    .submit {
        grid-column: 1 / span 2;
        width: 100%;
    }

    .danger {
        margin-top: 5em;
    }

    :global(.danger > button) {
        margin: auto;
    }

    :global(form p) {
        margin: 0;
    }

    p.minor {
        color: var(--color-minor);
        font-size: 0.9em;
    }
</style>



<form>
    <p>Name</p>
    <TextInput bind:value={wall.name}/>
    <p>Visibility</p>
    <RadioInput
        buttonClass="dark"
        options={[{label: "public", value: true}, {label: "private", value: false}]}
        bind:value={wall.public}/>
    <!-- string booleans are limitation of bits ui (or maybe html idk) -->
    {#if wall.public}
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
    <RadioInput
        buttonClass="dark"
        options={[{label: "yes", value: true}, {label: "no", value: false}]}
        bind:value={wall.allow_training}/>
    <br/>
    <p class="minor">
        Whether we may use images of this wall to train machine learning models. Datasets containing your images and models we train with them will always be free and public.
        <br/>
        You can change this setting at any time, but doing so will only affect future training datasets we create from that point on.
    </p>
    <button class="submit buttonDark" disabled={!submitEnabled || awaitingSave} on:click|preventDefault|stopPropagation={createUpdateWall}>
        {#if awaitingSave}
            Updating<LoadingEllipsis active={true}/>
        {:else}
            Save
        {/if}
    </button>
    {#if errorMessage}
        <p class="minor">Error: {errorMessage}</p>
    {/if}
</form>
<!-- TODO: better styling -->
<div class="danger">
    <ConfirmModal buttonText="Delete" buttonClass="buttonDeleteInverse" title={`Delete ${wall.name} ?`}>
        <div slot="message">
            <p>This will also delete this wall's Sets and Routes, and there's no going back.</p>
        </div>
        <button slot="confirm" class="buttonDelete" on:click={() => deleteWall(wall.id)}>Delete</button>
    </ConfirmModal>
</div>