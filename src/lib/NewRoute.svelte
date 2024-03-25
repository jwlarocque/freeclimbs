<script lang="ts">
    import { pb } from "$lib/pocketbase";
	import BoolInput from "./BoolInput.svelte";

    import RadioInput from "./RadioInput.svelte";
	import SelectInput from "./GradeSelect.svelte";
	import TextInput from "./TextInput.svelte";
    import { Checkbox } from "bits-ui";
	import GradeSelect from "./GradeSelect.svelte";

    export let selectedSet;
    export let selectedRoute;
    export let newHoldType = "holds";
    export let creatingRoute;

    let errorMessage;
    let savingRoute = false;

    $: console.log(selectedRoute);
    
    async function createUpdateRoute(draft=true) {
        selectedRoute.draft = draft;
        errorMessage = null;
        savingRoute = true;
        if (!selectedRoute.id) {
            const record = await pb.collection("routes").create(
                selectedRoute
            );
            selectedRoute.id = record.id;
        } else {
            await pb.collection("routes").update(selectedRoute.id, selectedRoute);
            // TODO: navigation after publish?
        }
        selectedRoute = selectedRoute;
        savingRoute = false;
        if (!draft) {
            creatingRoute = false;
        }
    }
</script>

<!-- TODO: nicer styling for this form -->
<style>
    form {
        display: grid;
        grid-template-columns: 1fr 3fr;
        grid-column-gap: 1em;
        grid-row-gap: 1em;
        align-items: center;
        justify-items: start;
        gap: 1em;
        margin: auto;
        font-size: 1em;
        width: 100%;
    }

    .buttonGroup {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 1em;
    }

    button {
        width: 100%;
    }
</style>

<form>
    <p>Add Holds</p>
    <!-- TODO: style these radio buttons to match RouteViewer hold outlines -->
    <RadioInput
        options={[{label: "Start", value: "start"}, {label: "Finish", value: "finish"}, {label: "Normal", value: "holds"}]}
        bind:value={newHoldType}
        buttonClass="dark"
    />
    <p>Name</p>
    <TextInput bind:value={selectedRoute.name}/>
    <p>Setter Grade</p>
    <GradeSelect bind:selectedGrade={selectedRoute.setter_grade}/>
    <p>Free Feet</p>
    <BoolInput bind:value={selectedRoute.free_feet}/>
    <p>Top Out</p>
    <BoolInput bind:value={selectedRoute.top_out}/>
</form>
<div class="buttonGroup">
    <button
        class="buttonDarkInverse"
        on:click={() => createUpdateRoute(true)}
    >
        Save Draft
    </button>
    <button
        class="buttonDarkInverse"
        on:click={() => createUpdateRoute(false)}
    >
        Publish
    </button>
</div>