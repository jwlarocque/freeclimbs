<script lang="ts">
    import { page } from "$app/stores";
    import { goto } from "$app/navigation";
    import { authStore, getShare, createUserShare } from "$lib/pocketbase";
    import { getWallUrl } from "$lib/url";
    import LoadingEllipsis from "$lib/LoadingEllipsis.svelte";
	import LoginModal from "$lib/LoginModal.svelte";

    async function redeemShare() {
        if (!$authStore.isValid) {
            throw new Error("You must be logged in to access a Shared Wall.");
        }
        const shareId = $page.url.searchParams.get("secret");
        if (!shareId) {
            throw new Error("No Share secret provided.");
        }
        let share = await getShare(shareId);
        await createUserShare(share.id);
        window.setTimeout(() => { goto(getWallUrl(share.wall)); }, 1000);
        return share.wall;
    }
</script>

<style>
    main {
        margin: auto;
        width: auto;
        height: 100%;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        max-width: fit-content;
    }

    div.sign {
        margin: 1em;
    }

    div.center {
        margin: auto;
        max-width: fit-content;
    }

    h3 {
        margin: 0;
    }

    p {
        color: var(--color-major)
    }
</style>

<main>
    <div class="sign">
        {#if $authStore.isValid}
        {#await redeemShare()}
            <h3>Loading Share<LoadingEllipsis active={true}/></h3>
        {:then wallId}
            {#if wallId}
                <h3>Access Granted!</h3>
                <p>If you're not redirected shortly, <a href="{getWallUrl(wallId)}">click here</a>.</p>
            {/if}
        {:catch error}
            <p>Error: {error.message}</p>
            {#if error.status == 404}
                <p>This Share may not exist or it may have been deleted. Contact the Wall owner if you believe this is an error.</p>
            {/if}
        {/await}
        {:else}
            <p>You must be logged in to access a Shared Wall.</p>
            <div class="center">
                <LoginModal/>
            </div>
        {/if}
    </div>
</main>