<script lang="ts">
    import { authStore, pb } from "$lib/pocketbase";
    import { Pagination, Select } from "bits-ui";
	import LoadingEllipsis from "./LoadingEllipsis.svelte";
	import ConfirmModal from "./ConfirmModal.svelte";
	import PrevIcon from "./icons/PrevIcon.svelte";
	import NextIcon from "./icons/NextIcon.svelte";
	import ChevronDownIcon from "./icons/ChevronDownIcon.svelte";
	import ArrowDownIcon from "./icons/ArrowDownIcon.svelte";
	import Dropdown from "./Dropdown.svelte";
    import GradeSlider from "./GradeSlider.svelte";
	import { last } from "@melt-ui/svelte/internal/helpers";
    import {grades} from "./grades";

    export let set;
    export let selectedRoute;
    export let creatingRoute;

    const today = new Date();
    const SYSTEM = "v";
    const PAGE_SIZE = 30;
    const SORT_OPTIONS = [
        {value: "created", label: "Date Created"},
        {value: "name", label: "Name"}
    ];
    const FILTER_OPTIONS = [
        {value: "1 = 1", label: "All"},
        {value: "draft = True", label: "Draft"},
        {value: "draft = False", label: "Not Draft"},
        {value: "setter = '" + $authStore.model.id + "'", label: "My Routes"},
        {value: "created >= '" + daysAgo(7) + "'", label: "New This Week"}, // TODO: evalute at query time
    ];

    let totalItems;
    let currPage = 1;
    let pagesRoutes = {};
    let routes = [];
    // workaround for https://github.com/sveltejs/svelte/issues/5689
    // (doesn't prevent double render on load, but does fix rerender on
    //  selectedRoute change which is good enough for now)
    let routesStale = true;
    let loadingRoutes = false;
    let lastCurrPage;
    let lastSetId;
    $: if (set && currPage) {
        if (lastSetId != set.id || lastCurrPage != currPage) {
            routesStale = true;
        }
        lastSetId = set.id;
        lastCurrPage = currPage;
    }
    $: if (set && routesStale) {
        pagesRoutes = {};
        if (currPage) {
            routesStale = false;
            loadRoutes(currPage);
        }
    }

    let lastSortSelected = SORT_OPTIONS[0];
    let sortSelected = SORT_OPTIONS[0];
    let lastFilterSelected = FILTER_OPTIONS[0];
    let filterSelected = FILTER_OPTIONS[0];
    let lastDesc = true;
    let desc = true;
    let lastGradeRange = [0, 99999]; // it's stupid but it works
    let gradeRange = [0, 99999];
    // TODO: this is getting to be a mess
    $: if (
        lastSortSelected != sortSelected 
        || lastDesc != desc 
        || lastFilterSelected != filterSelected
        || gradeRange[0] != lastGradeRange[0]
        || gradeRange[1] != lastGradeRange[1]
    ) {
        lastSortSelected = sortSelected;
        lastDesc = desc;
        lastFilterSelected = filterSelected;
        lastGradeRange[0] = gradeRange[0];
        lastGradeRange[1] = gradeRange[1];
        currPage = 1;
        routes = [];
        routesStale = true;
    }

    // TODO: error and loading
    async function loadRoutes(page=1) {
        loadingRoutes = true;
        if (pagesRoutes[page]) {
            return pagesRoutes[page];
        }
        console.log(`set="${set.id}" && ${filterSelected.value}`);
        const records = await pb.collection("routes").getList(
            page, PAGE_SIZE, {
                sort: `-draft,${desc ? "-" : ""}${sortSelected.value}`,
                filter: `set="${set.id}" && ${filterSelected.value} && ${gradeRange[0]} <= setter_grade && ${gradeRange[1]} >= setter_grade`
            }
        );
        totalItems = records.totalItems;
        pagesRoutes[page] = records?.items;
        routes = records?.items;
        loadingRoutes = false;
    }

    async function deleteRoute(id) {
        await pb.collection("routes").delete(id);
        currPage = 1;
        routes = await loadRoutes(currPage);
    }

    function daysAgo(days) {
        let date = new Date();
        date.setTime(date.getTime() - (days * 24 * 60 * 60 * 1000));
        return date.toISOString();
    }
</script>

<style>
    main {
        display: flex;
        flex-direction: column;
        min-height: 100%;
        height: 100%;
        gap: 5px;
    }

    hr {
        border: 1px solid var(--color-hover-background);
        margin: 1em;
    }

    header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 5px;
        padding: 0;
        width: 100%;
    }

    /* Why does this need to be global? */
    :global(.routesHeader > button) {
        width: 100%;
    }

    :global(#sortTrigger) {
        width: 100%;
    }

    #prompter {
        flex: 1 1 auto;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
        color: var(--color-minor);
    }

    .routes {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr;
        gap: 5px;
    }

    .route {
        display: grid;
        grid-template-columns: subgrid;
        grid-column: span 3;
        justify-content: space-between;
        gap: 1em;
        position: relative;
        cursor: pointer;
        border-radius: var(--primary-radius);
        padding: 0 1em;
        transition: background-color 0.1s ease-in-out, transform 0.1s ease-in-out;
        border: 1px solid transparent;
    }

    .route.selected, .route:hover {
        background-color: var(--color-hover-background);
    }

    .route > div {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5em;
    }

    .ownerActions {
        margin-left: auto;
    }

    .minor {
        color: var(--color-minor);
        font-size: 0.9em;
    }

    :global(.dropdown) {
        display: flex;
        flex-direction: column;
        background-color: var(--color-major);
        border-radius: var(--primary-radius);
        border: 1px solid var(--color-minor);
        margin-top: 0.5em;
        box-shadow: 0 0 5px var(--color-minor);
        box-sizing: border-box;
        overflow: hidden;
    }

    :global(.dropdown p) {
        width: 100%;
        text-align: center;
        padding: 1em;
        margin: 0;
        box-sizing: border-box;
        cursor: pointer;
    }

    :global(.dropdown p:hover) {
        background-color: var(--color-hover-background);
    }

    #desc {
        width: calc(1em + var(--button-padding));
        padding: 0.25em;
    }

    :global(#desc svg) {
        transition: all 0.1s ease-in-out;
    }

    :global(.flipped svg) {
        transform: rotate(180deg);
    }
</style>

<main>
    {#if set}
        {#await routes}
            <p>Loading routes<LoadingEllipsis active={true}/></p>
        {:then routesCopy}
            <div>
                <GradeSlider bind:externalValue={gradeRange}/>
            </div>
            <header class="routesHeader">
                <Dropdown prefix="Sort by: " options={SORT_OPTIONS} bind:selected={sortSelected}/>
                <button
                    class={desc ? "buttonDark" : "buttonDark flipped"}
                    id="desc"
                    on:click={() => desc = !desc}
                    title={desc ? "Descending" : "Ascending"}
                >
                    <ArrowDownIcon/>
                </button>
                <!-- TODO: filter dropdowns -->
                <Dropdown prefix="Filter: " options={FILTER_OPTIONS} bind:selected={filterSelected}/>
            </header>
            <hr/>
            <div class="routes">
                {#each routesCopy as route (route.id)}
                    <!-- TODO: put this in a component probably-->
                    <div
                        class={"route " + (selectedRoute?.id == route.id ? "selected" : "")}
                        on:click={() => selectedRoute = route}
                        on:keydown={() => selectedRoute = route}
                        role="button"
                        tabindex="0"
                    >
                        <p>
                            {#if route.draft}
                                <span class="minor">Draft:</span>
                            {/if}
                            {route.name}
                        </p>
                        <p>{grades[route.setter_grade][SYSTEM]}</p>
                        <div class="ownerActions">
                            {#if route.setter == $authStore.model?.id}
                                {#if route.draft}
                                    <button class="buttonDarkTwo" on:click={() => {selectedRoute = route; creatingRoute = true;}}>Edit</button>
                                {/if}
                                <!-- TODO: copy confirm language from EditWall -->
                                <ConfirmModal buttonText="Delete" buttonClass="buttonDeleteInverse" title="Confirm Deletion">
                                    <div slot="message">
                                        <p>Are you sure you want to delete this route?</p>
                                        <p>This cannot be undone.</p>
                                    </div>
                                    <button slot="confirm" class="buttonDelete" on:click={() => deleteRoute(route.id)}>Delete</button>
                                </ConfirmModal>
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
            {#if routesCopy.length > 0}
                <Pagination.Root
                    class="paginav"
                    count={totalItems}
                    perPage={PAGE_SIZE}
                    let:pages
                    let:range
                    bind:page={currPage}
                >
                    <!-- TODO: disable prev and next buttons when no additional pages -->
                    <Pagination.PrevButton class="buttonDark paginationButton">
                        <PrevIcon/>
                    </Pagination.PrevButton>
                    {#each pages as page (page.key)}
                        {#if page.type == "ellipsis"}
                            ...
                        {:else}
                            <Pagination.Page  class={page.value == currPage ? "buttonDark paginationButton current" : "buttonDark paginationButton"} {page}/>
                        {/if}
                    {/each}
                    <Pagination.NextButton class="buttonDark paginationButton">
                        <NextIcon/>
                    </Pagination.NextButton>
                </Pagination.Root>
            {:else}
                <div id="prompter">
                    {#if loadingRoutes}
                        <p>Loading Routes<LoadingEllipsis active={true}/></p>
                    {:else}
                        <p>No Routes Yet</p>
                    {/if}
                </div>
            {/if}
        {/await}
    {:else}
        <div id="prompter">
            <p>Select or Create a Set</p>
        </div>
    {/if}
</main>