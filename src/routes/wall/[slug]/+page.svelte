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
    let showControls = true;
    let selectedSet;
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

    header {
        position: relative;
    }

    #toggleControls {
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        margin: auto;
        visibility: hidden;
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
        margin-bottom: 5px;
    }

    :global(.tabs > *) {
        width: 100%;
    }

    :global(.tabs > *[data-state="active"]) {
        background-color: var(--color-hover-background);
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

    @media (max-width: calc(40em + 2em + 15px)) {
        main {
            flex-direction: column-reverse;
            flex-wrap: nowrap;
        }

        #toggleControls {
            visibility: visible;
            transition: transform 0.1s ease-in-out;
        }

        #toggleControls.flipped {
            transform: translateY(-50%) rotate(180deg);
        }

        #viewer {
            width: 100%;
            flex: 1 1 auto;
        }

        :global(.controls) {
            width: 100%;
            flex: 1 0 auto;
            max-height: 50%;
            min-height: 0;
            overflow-y: hidden;
        }

        :global(.controls.visible) {
            min-height: 50%;
            overflow-y: auto;
        }

        :global(.hiddenControls) {
            display: none;
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
            <Tabs.Root class={showControls ? "controls visible" : "controls"}>
                <!-- TODO: consider putting route name in here -->
                <header>
                    <h3>{wall.name}</h3>
                    <button
                        class={showControls ? "buttonDark" : "buttonDark flipped"}
                        id="toggleControls"
                        on:click={() => showControls = !showControls}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                            <path d="M480-345 240-585l56-56 184 184 184-184 56 56-240 240Z"/>
                        </svg>
                    </button>
                </header>
                <div class={showControls ? "" : "hiddenControls"}>
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
                        <!-- TODO: hide if not owner -->
                        <div id="settings">
                            <!-- TODO: don't reset wall state on update
                                       (better to stay on the Settings page)
                            -->
                            <EditWall wall={wall} onUpdate={() => {doLoadwall = loadWall()}}/>
                        </div>
                    </Tabs.Content>
                </div>
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