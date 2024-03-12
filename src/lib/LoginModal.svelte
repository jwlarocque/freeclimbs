<script lang="ts">
    import { createDialog, melt } from '@melt-ui/svelte';
    import { pb } from './pocketbase';

    async function login(provider) {
        try {
            const authData = await pb.collection('users').authWithOAuth2({ provider: provider });
        } catch (error) {
            console.error(error);
        }
    }

    const {
        elements: { trigger, portalled, overlay, content, title, description, close },
        states: { open }
    } = createDialog();
</script>

<style>
    .overlay {
        background-color: rgba(0, 0, 0, 0.5);
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
    }

    .content {
        width: 90%;
        max-width: 30em;
        box-sizing: border-box;
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 2;
    }

    .header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 2em;
    }

    svg.close {
        position: absolute;
        top: var(--inset);
        right: var(--inset);
        width: 15px;
        height: 15px;
        padding: 5px;
        cursor: pointer;
        fill: var(--color-major);
        border-radius: var(--primary-radius);
    }

    svg.close:hover {
        background-color: var(--color-hover-background);
        fill: black;
    }

    h3 {
        margin: 0 2em 1em 0;
        padding: 0;
        font-size: 1.8em;
    }

    .authList {
        display: flex;
        flex-direction: column;
        gap: 1em;
    }

    .authList button {
        text-transform: capitalize;
    }
</style>
   
<button use:melt={$trigger} class="buttonLight"><p>Log In</p></button>

<div use:melt={$portalled}>
    {#if $open}
        <div use:melt={$overlay} class="overlay"/>
        <div use:melt={$content} class="sign content">
            <svg class="close" use:melt={$close} xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
            </svg>
            <div class="header">
                <h3 use:melt={$title}>Log In With:</h3>
            </div>
            <div class="authList" use:melt={$description}>
                {#await pb.collection("users").listAuthMethods()}
                    <p>Loading...</p>
                {:then authMethods}
                    {#each authMethods?.authProviders as authMethod}
                        <button class="buttonLight" on:click={() => login(authMethod.name)}><p>{authMethod.name}</p></button>
                    {/each}
                {/await}
            </div>
        </div>
    {/if}
</div>