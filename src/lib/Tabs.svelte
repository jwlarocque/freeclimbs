<script lang="ts">
	import type { Snippet } from 'svelte';

	type Props = {
		tabs: Record<string, Snippet>;
	};
	let { tabs }: Props = $props();
	let selected = $state(Object.keys(tabs)[0]);
</script>

<header>
	{#each Object.keys(tabs) as tabName}
		<button class={selected === tabName ? 'selected' : ''} onclick={() => (selected = tabName)}>
			{tabName}
		</button>
	{/each}
</header>
<main>
	{@render tabs[selected]()}
</main>

<style>
	header {
		display: flex;
		flex-direction: row;
		align-items: center;
		width: 100%;
		box-sizing: border-box;
	}

	button {
		flex: 1 1 100%;
		border-right: none;
		border-radius: 0;
		border-top-left-radius: var(--primary-radius);
		border-top-right-radius: var(--primary-radius);
	}

	button.selected {
		cursor: default;
		background: var(--background-selected);
	}

	button.selected:hover {
		background: var(--background-selected);
	}

	main {
		flex: 1 1 auto;
		overflow: auto;
		background: var(--background-selected);
	}
</style>
