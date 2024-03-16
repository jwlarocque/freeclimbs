<script>
	import ConfirmModal from '$lib/ConfirmModal.svelte';
	import EditWall from '$lib/EditWall.svelte';
    import LoadingEllipsis from '$lib/LoadingEllipsis.svelte';
	import RouteList from '$lib/RouteList.svelte';
	import RouteViewer from '$lib/RouteViewer.svelte';
	import SetList from '$lib/SetList.svelte';
    import { pb, authStore } from '$lib/pocketbase.ts';

    export let data;

    let imageUrl;
    let doLoadwall = loadWall();
    let deleting = false;
    let showSets = false;
    let selectedSet;
    let showRoutes = false;
    let selectedRoute;

    async function loadWall() {
        const record = await pb.collection("walls").getOne(
            data.slug, {
                expand: "current_set"
            });
        if (record && record?.expand?.current_set) {
            imageUrl = `/api/files/${record.expand.current_set.collectionId}/${record.expand.current_set.id}/${record.expand.current_set.image}`;
        }
        selectedSet = record?.expand?.current_set;
        return record;
    }

    async function deleteWall(id) {
        deleting = true;
        try {
            await pb.collection("walls").delete(id);
            window.location.href = "/";
        } catch (error) {
            deleting = false;
            console.error(error);
        }
    }
</script>

<style>
    main {
        position: relative;
        box-sizing: border-box;
        min-height: 0;
        max-height: 100%;
        height: 100%;
        width: 100%;
        display: flex;
        flex-direction: column;
        padding: 0;
        background-color: var(--color-major);
        overflow: hidden;
    }

    header {
        background-color: var(--color-major);
        box-sizing: border-box;
        max-width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding: 1em;
        width: 100%;
        gap: 1em;
    }

    header > div {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1em;
    }

    h3 {
        /* font-size: min(4em, 10vw); */
        color: var(--color-background);
        margin: 0;
    }

    p {
        /* color: var(--color-minor); */
        margin: 0;
    }

    #content {
        position: relative;
        background-color: var(--color-major);
        border-radius: calc(var(--primary-radius) - 5px);
        overflow: hidden;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 5px;
        width: 100%;
    }

    :global(#content > div) {
        border-radius: calc(var(--primary-radius) - 5px);
    }

    #content > p {
        padding: 1em;
    }

    #sets, #routes {
        flex: 1 1 60em;
        background-color: var(--color-major);
        width: 60rem;
        max-width: 80%;
        height: 100%;
        overflow-y: auto;
    }

    @media (max-width: 600px) {
        #sets, #routes {
            position: absolute;
            z-index: 3;
            top: 0;
            border-radius: 0;
        }

        #sets {
            left: 0;
            padding-right: 5px;
        }

        #routes {
            right: 0;
            padding-left: 5px;
        }
    }
            

</style>

<main class="sign">
    {#await doLoadwall}
        <header>
            <h3>Loading Wall<LoadingEllipsis active={true}/></h3>
        </header>
    {:then wall}
            <header>
                <button
                    class="buttonDark" 
                    on:click={() => showSets = !showSets}
                >
                    Set: {selectedSet.name || "None"}
                </button>
                <div>
                    <h3>{wall.name}</h3>
                    {#if $authStore.model?.id == wall.owner}
                            <EditWall buttonClass="buttonDark" wallId={wall.id} data={wall} onUpdate={() => {doLoadwall = loadWall()}}/>
                            <ConfirmModal buttonText="Delete" buttonClass="buttonDeleteInverse" title="Confirm Deletion">
                                <div slot="message">
                                    <p>Are you sure you want to delete this wall?</p>
                                    <p>This action will also delete this wall's Sets and Routes and cannot be undone.</p>
                                </div>
                                <button slot="confirm" class="buttonDelete" on:click={() => deleteWall(wall.id)}>Delete</button>
                            </ConfirmModal>
                    {/if}
                </div>
                <button
                    class="buttonDark" 
                    on:click={() => showRoutes = !showRoutes}
                >
                    Route: {selectedRoute?.name || "None"}
                </button>
            </header>
            <div id="content">
                {#if showSets}
                    <div id="sets">
                        <SetList isOwner={$authStore.model?.id == wall.owner} wall={wall} bind:selectedSet/>
                    </div>
                {/if}
                <RouteViewer bind:set={selectedSet} route={null} panzoomEnabled={true}/>
                <!-- TODO: list of routes -->
                {#if showRoutes}
                    <div id="routes">
                        <RouteList set={selectedSet} bind:selectedRoute/>
                    </div>
                {/if}
            </div>
    {:catch error}
        <header>
            <h3>Error:</h3>
        </header>
        <div id="content">
            {#if error.status == 404}
                <p>Wall not found. This wall may not exist or you may not have permission to view it.</p>
            {:else}
                <p>{error.message}</p>
                <p>{error.originalError}</p>
                <!-- <p>{Object.keys(error)}</p> -->
            {/if}
        </div>
    {/await}
</main>