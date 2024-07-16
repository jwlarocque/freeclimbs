<script>
	import { browser } from '$app/environment';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import ConfirmModal from '$lib/ConfirmModal.svelte';
	import EditWall from '$lib/EditWall.svelte';
    import LoadingEllipsis from '$lib/LoadingEllipsis.svelte';
	import NewRoute from '$lib/NewRoute.svelte';
	import RadioInput from '$lib/RadioInput.svelte';
	import RouteList from '$lib/RouteList.svelte';
	import RouteViewer from '$lib/RouteViewer.svelte';
	import SetList from '$lib/SetList.svelte';
	import ChevronDownIcon from '$lib/icons/ChevronDownIcon.svelte';
    import { pb, authStore, loadSet, loadRoute } from '$lib/pocketbase.ts';
    import { Tabs } from 'bits-ui';

    export let data;

    let imageUrl;
    let showControls = true;
    let selectedSet;
    let lastSelectedSet;
    let selectedRoute;
    let lastSelectedRouteId;
    let creatingRoute = false;
    let newHoldType = "holds";
    const holdsTypes = ["start", "finish", "holds"];
    let doLoadwall = loadWall();
    let wallName = "Loading...";

    $: pageTitle = "Freeclimbs | " + wallName + (
        selectedSet ? " - " + selectedSet.name + (
            selectedRoute ? " - " + selectedRoute.name : "") : "");

    function resetRoute() {
        selectedRoute = {
            "set": selectedSet.id,
            "setter": pb.authStore.model?.id,
            "name": "",
            "setter_grade": 0,
            "free_feet": false,
            "top_out": false,
            "draft": true,
            "holds": {
                "start": [],
                "finish": [],
                "holds": []
            }
        };
    }
    
    // TODO: put this in a lib
    function onRouteViewerClick(event) {
        if (!selectedSet?.holds) {
            return;
        }
        let candidates = [];
        for (let hold of selectedSet.holds) {
            if (event.offsetY >= hold.top
                && event.offsetY <= hold.bottom
                && event.offsetX >= hold.left
                && event.offsetX <= hold.right
            ){
                candidates.push(hold);
            }
        }
        if (!candidates || candidates.length == 0) {
            return;
        }
        candidates.sort((a, b) => {
            let adx = ((a.left + a.right) / 2 - event.offsetX) ** 2;
            let ady = ((a.top + a.bottom) / 2 - event.offsetY) ** 2;
            let bdx = ((b.left + b.right) / 2 - event.offsetX) ** 2;
            let bdy = ((b.top + b.bottom) / 2 - event.offsetY) ** 2;
            return (adx + ady) - (bdx + bdy);
        });
        let oldHoldType;
        for (let holdType of holdsTypes) {
            if (selectedRoute.holds[holdType].includes(candidates[0].id)) {
                oldHoldType = holdType;
                break;
            }
        }
        if (oldHoldType) {
            selectedRoute.holds[oldHoldType].splice(selectedRoute.holds[oldHoldType].indexOf(candidates[0].id), 1);
        }
        if (newHoldType != oldHoldType) {
            selectedRoute.holds[newHoldType].push(candidates[0].id);
        }
        selectedRoute.holds = selectedRoute.holds;
    }

    // clear selected route when selected set changes
    // TODO: kinda awk
    $: if (selectedSet && lastSelectedSet != selectedSet) {
        lastSelectedSet = selectedSet;
        selectedRoute = null;
        creatingRoute = false;
        if (selectedSet.id != $page.url.searchParams.get("set")) {
            goto(`?set=${selectedSet.id}`);
        }
    }

    $: if (selectedRoute && lastSelectedRouteId != selectedRoute.id) {
        lastSelectedRouteId = selectedRoute.id;
        if (selectedRoute.id) {
            goto(`?set=${selectedSet.id}&route=${selectedRoute.id}`);
        } else {
            goto(`?set=${selectedSet.id}`);
        }
    }

    async function loadWall() {
        const record = await pb.collection("walls").getOne(
            data.slug, {
                expand: "current_set"
            });
        if (record && record?.expand?.current_set) {
            imageUrl = `/api/files/${record.expand.current_set.collectionId}/${record.expand.current_set.id}/${record.expand.current_set.image}`;
        }
        if ($page.url.searchParams.get("set")) {
            selectedSet = await loadSet($page.url.searchParams.get("set"));
        } else {
            selectedSet = record?.expand?.current_set;
        }
        if ($page.url.searchParams.get("route")) {
            selectedRoute = await loadRoute($page.url.searchParams.get("route"));
        }
        wallName = record?.name;
        return record;
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
        background-image: none;
        overflow: hidden;
    }

    header {
        position: relative;
    }

    #toggleControls {
        padding: 0.25em;
        position: absolute;
        right: 0;
        top: 50%;
        transform: translateY(-50%);
        margin: auto;
        visibility: hidden;
        width: auto;
    }

    #toggleControls:not(:hover) {
        background-color: var(--color-major);
    }

    :global(.controls) {
        position: relative;
        flex: 1 1 20em;
        display: flex;
        flex-direction: column;
        gap: 5px;
        max-width: 40em;
        max-height: 100%;
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

    :global(.tabContainer) {
        overflow-y: auto;
        padding-bottom: 2em;
    }

    :global(.tabPanel > div) {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    #newRoute {
        position: absolute;
        bottom: 0;
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

    .error {
        width: 100%;
        margin: 1em auto;
        text-align: center;
    }

    h3 {
        color: var(--color-background);
        margin: 0;
        text-align: center;
        font-size: min(1.2em, 6dvw);
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

        /* :global(#toggleControls.flipped) {
            transform: translateY(-50%) rotate(180deg);
        } */

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

<svelte:head>
    <title>
        {pageTitle}
    </title>
</svelte:head>
<main class="sign">
    {#await doLoadwall}
        <!-- TODO: check that this still works -->
        <header>
            <h3>Loading Wall<LoadingEllipsis active={true}/></h3>
        </header>
    {:then wall}
            <Tabs.Root class={showControls ? "controls light visible" : "controls light"}>
                <!-- TODO: consider putting route name in here -->
                <header>
                    <h3>{wall.name}</h3>
                    <button
                        class={showControls ? "buttonDark" : "buttonDark flipped"}
                        id="toggleControls"
                        on:click={() => showControls = !showControls}
                    >
                        <ChevronDownIcon/>
                    </button>
                </header>
                <div class={showControls ? "tabContainer" : "hiddenControls"}>
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
                        <!-- TODO: put all this in a component -->
                        <div>
                            {#if creatingRoute}
                                <button class="buttonDarkInverse" on:click={() => {creatingRoute = false; selectedRoute = null;}}>Cancel</button>
                                <!-- TODO: too many bound props, awk -->
                                <NewRoute selectedSet={selectedSet} bind:newHoldType bind:selectedRoute bind:creatingRoute/>
                            {:else}
                                <br/>
                                <RouteList set={selectedSet} bind:selectedRoute bind:creatingRoute/>
                                <!-- TODO: this button needs to go somewhere else -->
                                <!-- TODO: auth check for more complex authorization setups -->
                                {#if $authStore.isValid && selectedSet}
                                    <button class="buttonDarkInverse" id="newRoute" on:click={() => {creatingRoute = true; resetRoute();}}>New Route</button>
                                {/if}
                            {/if}
                        </div>
                    </Tabs.Content>
                    <Tabs.Content value="settings" class="tabPanel">
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
                <RouteViewer
                    bind:set={selectedSet}
                    route={selectedRoute}
                    panzoomEnabled={true}
                    onClick={creatingRoute ? onRouteViewerClick : () => {}}
                />
            </div>
    {:catch error}
        <div id="content" class="error">
            <h3>Error: {error.status}</h3>
            {#if error.status == 404}
                <p>Wall, set, or route not found. This content may not exist or you may not have permission to view it.</p>
            {:else}
                <p>{error.message}</p>
                <p>{error.originalError}</p>
            {/if}
        </div>
    {/await}
</main>