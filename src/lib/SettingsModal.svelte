<script lang="ts">
	import { Dialog, Separator, Label } from 'bits-ui';
	import CloseIcon from './icons/CloseIcon.svelte';
	import Dropdown from './Dropdown.svelte';
	import { grades, systems } from './grades';
	import { userSettingsStore } from './pocketbase';

	export let buttonText = '';
	export let buttonClass;
	export let title = '';

	let open: boolean;
	let gradeSystem = null;
	$: if (!gradeSystem) {
		gradeSystem = systems.find(
			(system) => system.value == ($userSettingsStore?.grading_system || 'v')
		);
	}
	$: console.log(gradeSystem);
	async function saveSettings() {
		let current = $userSettingsStore;
		current.grading_system = gradeSystem.value;
		$userSettingsStore = current;
		open = false;
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Trigger class={'modalButton ' + (buttonClass || 'buttonLight')}>
		{#if buttonText}
			<p>{buttonText}</p>
		{:else}
			<slot name="button" />
		{/if}
	</Dialog.Trigger>
	<Dialog.Portal>
		<Dialog.Overlay class="modalOverlay" />
		<div id="contentWrapper">
			<Dialog.Content class="sign modalContent">
				<header>
					<h3>{title}</h3>
					<Dialog.Close class="closeContainer">
						<CloseIcon />
					</Dialog.Close>
				</header>
				<Dropdown
					buttonClass="buttonLight"
					prefix="Grading System: "
					options={systems}
					bind:selected={gradeSystem}
				/>
				<button class="buttonSave buttonLight" on:click={saveSettings}>Save</button>
			</Dialog.Content>
		</div>
	</Dialog.Portal>
</Dialog.Root>

<style>
	h3 {
		margin: 0 0.5em 1em 0;
	}

	:global(.modalButton) {
		margin: auto;
	}

	#contentWrapper :global(.modalContent .buttonSave) {
		margin: auto;
	}
	#contentWrapper :global(.modalContent .buttonSave:hover) {
		background-color: var(--color-hover-background);
	}
</style>
