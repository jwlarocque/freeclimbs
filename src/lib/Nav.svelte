<script>
	import Dialog from '$lib/Dialog.svelte';
	import { auth, listAuthProviders, login, logout } from '$lib/pocketbase.svelte.ts';
	import Loading from './Loading.svelte';
	import { navTitle } from '../routes/global.svelte';
</script>

<nav>
	<h1>Freeclimbs{navTitle?.suffix ? ` - ${navTitle.suffix}` : ''}</h1>
	{#if auth?.model}
		<button class="buttonTransparent" onclick={() => logout()}>Log Out</button>
	{:else}
		<Dialog>
			{#snippet button(open)}
				<button class="buttonTransparent" onclick={() => open.set(true)}>Log In</button>
			{/snippet}
			{#snippet contents(open)}
				<h3>Log In</h3>
				<div id="providers">
					{#await listAuthProviders()}
						<p>Loading<Loading active={true} /></p>
					{:then providers}
						{#each providers as provider}
							<button class="buttonTransparent" onclick={() => login(provider.name)}
								>{provider.displayName}</button
							>
						{/each}
					{:catch error}
						<p>Error: {error}</p>
					{/await}
				</div>
			{/snippet}
		</Dialog>
	{/if}
</nav>

<style>
	nav {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	h1 {
		margin: 0;
	}

	#providers {
		display: flex;
		flex-direction: column;
		gap: 1em;
		align-items: center;
	}

	#providers button {
		width: 100%;
	}
</style>
