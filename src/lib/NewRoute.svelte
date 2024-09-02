<script lang="ts">
	import { pb } from '$lib/pocketbase';
	import BoolInput from './BoolInput.svelte';

	import RadioInput from './RadioInput.svelte';
	import SelectInput from './GradeSelect.svelte';
	import TextInput from './TextInput.svelte';
	import { Checkbox } from 'bits-ui';
	import GradeSelect from './GradeSelect.svelte';

	export let selectedSet;
	export let selectedRoute;
	export let newHoldType = 'holds';
	export let creatingRoute;

	let errorMessage;
	let savingRoute = false;

	$: console.log(selectedRoute);

	async function createUpdateRoute(draft = true) {
		selectedRoute.draft = draft;
		errorMessage = null;
		savingRoute = true;
		if (!selectedRoute.id) {
			const record = await pb.collection('routes').create(selectedRoute);
			selectedRoute.id = record.id;
		} else {
			await pb.collection('routes').update(selectedRoute.id, selectedRoute);
			// TODO: navigation after publish?
		}
		selectedRoute = selectedRoute;
		savingRoute = false;
		if (!draft) {
			creatingRoute = false;
		}
	}
</script>

{#if selectedRoute}
	<div id="instructions">
		<p>
			Click on the wall to add holds to your route. Switch "Add Holds" mode to "Start" or "Finish"
			below to add holds of that type.
		</p>
		<p>
			Published routes cannot be edited. If you want to come back to this route later, click "Save
			Draft" (only you can see your draft routes).
		</p>
	</div>
	<hr />
	<form>
		<p>Add Holds</p>
		<!-- TODO: style these radio buttons to match RouteViewer hold outlines -->
		<RadioInput
			options={[
				{ label: 'Start', value: 'start' },
				{ label: 'Finish', value: 'finish' },
				{ label: 'Normal', value: 'holds' }
			]}
			bind:value={newHoldType}
			buttonClass="dark"
		/>
		<hr />
		<p>Name</p>
		<TextInput bind:value={selectedRoute.name} />
		<p>Setter Grade</p>
		<GradeSelect bind:selectedGrade={selectedRoute.setter_grade} />
		<p>Free Feet</p>
		<BoolInput bind:value={selectedRoute.free_feet} />
		<p>Top Out</p>
		<BoolInput bind:value={selectedRoute.top_out} />
	</form>
{/if}
<div class="buttonGroup">
	<button
		class="buttonDarkInverse"
		on:click={() => {
			creatingRoute = false;
			selectedRoute = null;
		}}
	>
		Cancel
	</button>
	<button class="buttonDarkInverse" on:click={() => createUpdateRoute(true)}> Save Draft </button>
	<button class="buttonDarkInverse" on:click={() => createUpdateRoute(false)}> Publish </button>
</div>

<!-- TODO: nicer styling for this form -->
<style>
	#instructions {
		margin: 0 1em;
		margin-bottom: -1em; /* TODO: do not do this */
	}

	hr {
		margin: 1em;
	}

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
		margin: 0 1em 1em;
	}

	form > hr {
		grid-column: 1 / span 2;
		margin: 0;
		width: 100%;
		box-sizing: border-box;
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
