<script>
	import ConfirmModal from '$lib/ConfirmModal.svelte';
	import EditWall from '$lib/EditWall.svelte';
    import LoadingEllipsis from '$lib/LoadingEllipsis.svelte';
	import RadioInput from '$lib/RadioInput.svelte';
	import RouteList from '$lib/RouteList.svelte';
	import RouteViewer from '$lib/RouteViewer.svelte';
	import SetList from '$lib/SetList.svelte';
    import { pb, authStore } from '$lib/pocketbase.ts';
    import { Tabs } from 'bits-ui';

    export let data;

    let imageUrl;
    let doLoadwall = loadWall();
    let showControls = true;
    let selectedSet;
    let lastSelectedSet;
    let selectedRoute;
    let creatingRoute = false;
    let newHoldType = "holds";
    const holdsTypes = ["start", "finish", "holds"];
    
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
    }

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

    :global(.tabPanel > div) {
        display: flex;
        flex-direction: column;
        gap: 5px;
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
                        <!-- TODO: put all this in a component -->
                        <div>
                            {#if creatingRoute}
                                <div>
                                    <button class="buttonDarkInverse" on:click={() => {creatingRoute = false; selectedRoute = null;}}>Cancel</button>
                                    <button class="buttonDarkInverse">Save</button>
                                </div>
                                <!-- TODO: style these radio buttons to match RouteViewer hold outlines -->
                                <RadioInput
                                    options={[{label: "Start", value: "start"}, {label: "Finish", value: "finish"}, {label: "Normal", value: "holds"}]}
                                    bind:value={newHoldType}
                                    buttonClass="dark"
                                />
                            {:else}
                                <button class="buttonDarkInverse" on:click={() => {creatingRoute = true; selectedRoute = {"holds": {"holds": [], "start": [], "finish": []}};}}>New Route</button>
                                <RouteList set={selectedSet} bind:selectedRoute/>
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