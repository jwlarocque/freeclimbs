<script lang="ts">
    // TODO: test with more than 1 page of sets
    import { pb } from "$lib/pocketbase";
    import { Pagination } from "bits-ui";
	import LoadingEllipsis from "./LoadingEllipsis.svelte";

    export let wallId;
    export let selectedSet;

    const PAGE_SIZE = 30;

    let totalItems;
    let currPage = 1;
    let pagesSets = {};

    // TODO: this will desync if a new set is created while some pages have been
    //       loaded and some have not. Maybe fix.
    async function loadSets(page=1) {
        if (pagesSets[page]) {
            return pagesSets[page];
        }
        const records = await pb.collection("sets").getList(
            page, PAGE_SIZE, {
                sort: "-created",
                filter: `wall = "${wallId}"`
            }
        );
        totalItems = records.totalItems;
        pagesSets[page] = records?.items;
        return records?.items;
    }
</script>

<style>
    main {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    :global(.paginav) {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 5px;
        margin: 0;
        width: 100%;
        color: black;
    }

    .set {
        position: relative;
        cursor: pointer;
        border-radius: var(--primary-radius);
        padding: 0 1em;
        transition: background-color 0.1s ease-in-out, transform 0.1s ease-in-out;
        
        border: 1px solid transparent;
    }

    /* TODO: better selected and hover styling */
    .set.selected, .set:hover {
        background-color: var(--color-hover-background);
    }

    .minor {
        color: var(--color-minor);
        font-size: 0.9em;
    }

    :global(.paginationButton) {
        padding: 0.25em;
        border-radius: calc(infinity * 1px);
    }
</style>

<main>
    {#await loadSets()}
        <p>Loading sets<LoadingEllipsis active={true}/></p>
    {:then}
        {#await loadSets(currPage)}
        <p>Loading sets<LoadingEllipsis active={true}/></p>
        {:then sets}
            {#each sets as set}
                <div
                    class={selectedSet.id == set.id ? "set selected" : "set"}
                    on:click={() => selectedSet = set}
                    on:keydown={() => selectedSet = set}
                    class:selected={selectedSet.id == set.id}
                    role="button"
                    tabindex="0"
                >
                    <!-- TODO: consider loading thumbnail images -->
                    <p>{set.name}</p>
                    <p class="minor">{(new Date(Date.parse(set.created))).toLocaleDateString()}</p>
                    <!-- TODO: if owner, option to make current -->
                    <!-- TODO: if permissions (?), option to delete -->
                </div>
            {/each}
        {/await}
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
                        <Pagination.Page  class="buttonDark paginationButton" {page}/>
                    {/if}
                {/each}
                <Pagination.NextButton class="buttonDark paginationButton">
                    <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                        <path d="M504-480 320-664l56-56 240 240-240 240-56-56 184-184Z"/>
                    </svg>
                </Pagination.NextButton>
        </Pagination.Root>
    {/await}
</main>