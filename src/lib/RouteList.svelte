<script lang="ts">
    import { authStore, pb } from "$lib/pocketbase";
    import { Pagination, Select } from "bits-ui";
	import LoadingEllipsis from "./LoadingEllipsis.svelte";
	import ConfirmModal from "./ConfirmModal.svelte";

    export let set;
    export let selectedRoute;

    const PAGE_SIZE = 30;

    let totalItems;
    let currPage = 1;
    let pagesRoutes = {};
    let routes;
    $: if (set && currPage) {
        routes = loadRoutes(currPage);
    }

    // TODO: error and loading
    async function loadRoutes(page=1) {
        if (pagesRoutes[page]) {
            return pagesRoutes[page];
        }
        const records = await pb.collection("routes").getList(
            page, PAGE_SIZE, {
                sort: "-created",
                filter: `set = "${set.id}"`
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

    .route.selected, .route:hover {
        background-color: var(--color-hover-background);
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
            {#each routesCopy as route}
                <div
                    class={selectedRoute?.id == route.id ? "route selected" : "route"}
                    on:click={() => selectedRoute = route}
                    on:keydown={() => selectedRoute = route}
                    role="button"
                    tabindex="0"
                >
                    <div>
                        <p>{route.name}</p>
                    </div>
                    {#if route.setter == $authStore.model?.id}
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
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                            <path d="M560-240 320-480l240-240 56 56-184 184 184 184-56 56Z"/>
                        </svg>
                    </Pagination.PrevButton>
                    {#each pages as page (page.key)}
                        {#if page.type == "ellipsis"}
                            ...
                        {:else}
                            <Pagination.Page  class={page.value == currPage ? "buttonDark paginationButton current" : "buttonDark paginationButton"} {page}/>
                        {/if}
                    {/each}
                    <Pagination.NextButton class="buttonDark paginationButton">
                        <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                            <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/>
                        </svg>
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