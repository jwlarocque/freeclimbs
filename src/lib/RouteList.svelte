<script lang="ts">
    import { authStore, pb } from "$lib/pocketbase";
    import { Pagination, Select } from "bits-ui";
	import LoadingEllipsis from "./LoadingEllipsis.svelte";
	import ConfirmModal from "./ConfirmModal.svelte";
	import PrevIcon from "./icons/PrevIcon.svelte";
	import NextIcon from "./icons/NextIcon.svelte";

    export let set;
    export let selectedRoute;
    export let creatingRoute;

    const PAGE_SIZE = 30;

    let totalItems;
    let currPage = 1;
    let pagesRoutes = {};
    let routes;
    // workaround for https://github.com/sveltejs/svelte/issues/5689
    // (doesn't prevent double render on load, but does fix rerender on
    //  selectedRoute change which is good enough for now)
    let routesStale = true;
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
        routes = [];
        if (currPage) {
            console.log(set, currPage);
            routes = loadRoutes(currPage);
            routesStale = false;
        }
    }

    // TODO: error and loading
    async function loadRoutes(page=1) {
        if (pagesRoutes[page]) {
            return pagesRoutes[page];
        }
        const records = await pb.collection("routes").getList(
            page, PAGE_SIZE, {
                sort: "-draft,-created",
                filter: `set="${set.id}"`
            }
        );
        totalItems = records.totalItems;
        pagesRoutes[page] = records?.items;
        return records?.items;
    }

    async function deleteRoute(id) {
        await pb.collection("routes").delete(id);
        currPage = 1;
        routes = await loadRoutes(currPage);
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

    header {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 5px;
        padding: 0;
        width: 100%;
    }

    header button {
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

    .route {
        display: flex;
        flex-direction: row;
        align-items: center;
        justify-content: space-between;
        gap: 1em;
        position: relative;
        cursor: pointer;
        border-radius: var(--primary-radius);
        padding: 0 1em;
        transition: background-color 0.1s ease-in-out, transform 0.1s ease-in-out;
        border: 1px solid transparent;
    }

    .route.draft {
        color: var(--color-minor);
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
</style>

<main>
    {#if set}
        {#await routes}
            <p>Loading routes<LoadingEllipsis active={true}/></p>
        {:then routesCopy}
            <header>
                <!-- TODO: sort dropdown -->
                <Select.Root>
                    <Select.Trigger id="sortTrigger" class="buttonDarkInverse">
                        <p>Sort</p>
                    </Select.Trigger>
                    <Select.Content class="sign">
                        <Select.Item value="name">
                            <p>Name</p>
                        </Select.Item>
                        <Select.Item value="created">
                            <p>Created</p>
                        </Select.Item>
                    </Select.Content>
                </Select.Root>
                <!-- TODO: filter dropdowns -->
            </header>
            {#each routesCopy as route (route.id)}
                <div
                    class={"route " + (selectedRoute?.id == route.id ? "selected" : "") + (route.draft ? " draft" : "")}
                    on:click={() => selectedRoute = route}
                    on:keydown={() => selectedRoute = route}
                    role="button"
                    tabindex="0"
                >
                    <div>
                        <p>{route.name + (route.draft ? " (Draft)" : "")}</p>
                    </div>
                    <div>
                        {#if route.setter == $authStore.model?.id}
                            {#if route.draft}
                                <button class="buttonDark" on:click={() => {selectedRoute = route; creatingRoute = true;}}>Edit</button>
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
                    <p>No Routes Yet</p>
                </div>
            {/if}
        {/await}
    {:else}
        <div id="prompter">
            <p>Select or Create a Set</p>
        </div>
    {/if}
</main>