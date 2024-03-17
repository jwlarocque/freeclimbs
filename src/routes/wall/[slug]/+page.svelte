<script>
	import ConfirmModal from '$lib/ConfirmModal.svelte';
	import EditWall from '$lib/EditWall.svelte';
    import LoadingEllipsis from '$lib/LoadingEllipsis.svelte';
	import RouteList from '$lib/RouteList.svelte';
	import RouteViewer from '$lib/RouteViewer.svelte';
	import SetList from '$lib/SetList.svelte';
    import { pb, authStore } from '$lib/pocketbase.ts';
    import { Tabs } from 'bits-ui';

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
        flex-direction: row;
        flex-wrap: wrap-reverse;
        gap: 5px;
        padding: 0;
        background-color: var(--color-major);
        overflow: hidden;
    }

    :global(.controls) {
        flex: 1 1 20em;
        display: flex;
        flex-direction: column;
        gap: 5px;
        max-width: 40em;
        max-height: 100%;
        overflow-y: auto;
    }

    :global(.tabs) {
        box-sizing: border-box;
        display: flex;
        flex-direction: row;
        justify-content: space-evenly;
        align-items: center;
        gap: 5px;
        padding: 5px;
        width: 100%;
        color: black;
        border: 1px solid var(--color-minor);
        border-radius: calc(infinity * 1px);
    }

    :global(.tabs > *) {
        width: 100%;
    }

    #viewer {
        flex: 1 1 20em;
        display: flex;
        flex-direction: column;
        min-width: 20em;
        width: 20em;
        max-height: 100%;
        min-height: 0;
    }

    h3 {
        color: var(--color-background);
        margin: 0;
        text-align: center;
    }

    /* TODO: I don't like media queries, and this one is an horrific hack
             but it does work. */
    @media (max-width: calc(40em + 2em + 15px)) {
        #viewer {
            height: 50%;
        }

        :global(.controls) {
            height: 50%;
            max-height: 50%;
        }
    }
</style>

<main class="sign">
    {#await doLoadwall}
        <!-- TODO: check that this still works -->
        <header>
            <h3>Loading Wall<LoadingEllipsis active={true}/></h3>
        </header>
    {:then wall}
            <Tabs.Root class="controls">
                <h3>{wall.name}</h3>
                <Tabs.List class="tabs">
                    <Tabs.Trigger value="routes" class="buttonDark">Routes</Tabs.Trigger>
                    <Tabs.Trigger value="sets" class="buttonDark">Sets</Tabs.Trigger>
                    {#if $authStore.model?.id == wall.owner}
                        <Tabs.Trigger value="settings" class="buttonDark">Settings</Tabs.Trigger>
                    {/if}
                </Tabs.List>
                <Tabs.Content value="sets" class="tabPanel">
                    <SetList isOwner={$authStore.model?.id == wall.owner} wall={wall} bind:selectedSet/>
                </Tabs.Content>
                <Tabs.Content value="routes" class="tabPanel">
                    <RouteList set={selectedSet} bind:selectedRoute/>
                </Tabs.Content>
                <Tabs.Content value="settings" class="tabPanel">
                    <div id="settings">
                        <EditWall buttonClass="buttonDark" wallId={wall.id} data={wall} onUpdate={() => {doLoadwall = loadWall()}}/>
                        <ConfirmModal buttonText="Delete" buttonClass="buttonDeleteInverse" title="Confirm Deletion">
                            <div slot="message">
                                <p>Are you sure you want to delete this wall?</p>
                                <p>This action will also delete this wall's Sets and Routes and cannot be undone.</p>
                            </div>
                            <button slot="confirm" class="buttonDelete" on:click={() => deleteWall(wall.id)}>Delete</button>
                        </ConfirmModal>
                    </div>
                </Tabs.Content>
            </Tabs.Root>
            <div id="viewer">
                <RouteViewer bind:set={selectedSet} route={null} panzoomEnabled={true}/>
            </div>
    {:catch error}
        <!-- TODO: check that this still works -->
        <header>
            <h3>Error:</h3>
        </header>
        <div id="content">
            {#if error.status == 404}
                <p>Wall not found. This wall may not exist or you may not have permission to view it.</p>
            {:else}
                <p>{error.message}</p>
                <p>{error.originalError}</p>
            {/if}
        </div>
    {/await}
</main>