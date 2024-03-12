<script lang="ts">
    import PocketBase from "pocketbase";
	import LoginModal from "./LoginModal.svelte";
    import { pb, authStore } from './pocketbase';
	import EditWall from "./EditWall.svelte";

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
        gap: 1em;
        align-items: center;
        flex-wrap: wrap;
    }

    nav > div {
        display: flex;
        flex-direction: row;
        justify-content: flex-end;
        gap: 1em;
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
    <h1><a href="/">Freeclimbs</a></h1>
    <div>
        <EditWall isNew={true}/>
        {#if $authStore.isValid}
            <button class="buttonLight" on:click={logout}><p>Log Out</p></button>
        {:else}
            <LoginModal/>
        {/if}
    </div>
</nav>
