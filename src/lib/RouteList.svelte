<script lang="ts">
    import { authStore, pb } from "$lib/pocketbase";
    import { Pagination } from "bits-ui";
	import LoadingEllipsis from "./LoadingEllipsis.svelte";
	import ConfirmModal from "./ConfirmModal.svelte";

    export let set;
    export let selectedRoute;

    const PAGE_SIZE = 30;

    let totalItems;
    let currPage = 1;
    let pagesRoutes = {};
    let routes;
    $: console.log(routes);
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
        gap: 5px;
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
</style>

<main>
    {#if set}
        {#await routes}
            <p>Loading routes<LoadingEllipsis active={true}/></p>
        {:then routesCopy}
            {#each routesCopy as route}
                <div
                    class={selectedRoute.id == route.id ? "route selected" : "route"}
                    on:click={() => selectedRoute = route}
                    on:keydown={() => selectedRoute = route}
                    role="button"
                    tabindex="0"
                >
                    <div>
                        <p>{route.name}</p>
                        <p>{route.description}</p>
                    </div>
                    {#if route.setter == $authStore.model?.id}
                        <ConfirmModal buttonText="Delete" buttonClass="buttonDeleteInverse" title="Confirm Deletion">
                            <div slot="message">
                                <p>Are you sure you want to delete this route?</p>
                                <p>This action will also delete this route and cannot be undone.</p>
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
                    <p>No Routes</p>
                </div>
            {/if}
        {/await}
    {:else}
        <div id="prompter">
            <p>Select a Set</p>
        </div>
    {/if}
</main>