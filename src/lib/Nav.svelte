<script lang="ts">
    import PocketBase from "pocketbase";
	import LoginModal from "./LoginModal.svelte";
    import { pb, authStore } from './pocketbase';
	import NewWall from "./NewWall.svelte";
	import SettingsModal from "./SettingsModal.svelte";

    async function logout() {
        await pb.authStore.clear();
        pb.authStore = pb.authStore;
    }
</script>

<style>
    nav {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        gap: min(1em, 2dvw);
        align-items: center;
        flex-wrap: wrap;
    }

    nav > div {
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        flex-wrap: wrap;
        gap: min(1em, 2dvw);
    }

    h1 {
        margin: 0;
        padding: 0;
        line-height: 1;
    }

    a {
        color: var(--color-major);
        text-decoration: none;
    }
</style>

<nav>
    <a href="/"><h1>Freeclimbs</h1></a>
    <div>
        {#if $authStore.isValid}
            <NewWall isNew={true}/>
            <SettingsModal buttonText="Settings" buttonClass="buttonLight" title="Settings"></SettingsModal>
            <button class="buttonLight" on:click={logout}><p>Log Out</p></button>
        {:else}
            <LoginModal/>
        {/if}
    </div>
</nav>
