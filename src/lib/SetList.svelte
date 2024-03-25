<script lang="ts">
    // TODO: test with more than 1 page of sets
    import { pb } from "$lib/pocketbase";
    import { Pagination } from "bits-ui";
	import LoadingEllipsis from "./LoadingEllipsis.svelte";
	import ConfirmModal from "./ConfirmModal.svelte";
	import PrevIcon from "./icons/PrevIcon.svelte";
	import NextIcon from "./icons/NextIcon.svelte";

    export let isOwner = false;
    export let wall;
    export let selectedSet;

    const PAGE_SIZE = 30;

    let totalItems;
    let currPage = 1;
    let pagesSets = {};
    let sets;
    $: console.log(sets);
    $: if (currPage) {
        sets = loadSets(currPage);
    }

    // TODO: this will desync if a new set is created while some pages have been
    //       loaded and some have not. Maybe fix.
    async function loadSets(page=1) {
        if (pagesSets[page]) {
            return pagesSets[page];
        }
        const records = await pb.collection("sets").getList(
            page, PAGE_SIZE, {
                sort: "-draft,-created",
                filter: `wall = "${wall.id}"`
            }
        );
        totalItems = records.totalItems;
        // if wall.expand.current_set is in the list, set it to the first
        let tempSets = records?.items;
        if (wall.expand.current_set.id) {
            tempSets = tempSets.filter((set) => set.id != wall.expand.current_set.id);
            tempSets.unshift(wall.expand.current_set);
        }
        pagesSets[page] = tempSets;
        return tempSets;
    }

    // TODO: error and loading
    async function updateDefaultSet(setId) {
        await pb.collection("walls").update(wall.id, {
            "current_set": setId
        });
        wall.expand.current_set = (await sets).find((set) => set.id == setId);
        // TODO: update set order so new default is first
    }

    // TODO: error and loading
    async function deleteSet(setId) {
        await pb.collection("sets").delete(setId);
        currPage = 1;
        sets = await loadSets(currPage);
        // TODO: close modal and reload Sets
    }
</script>

<style>
    /* TODO: switch to grid layout so set buttons are in line */
    main {
        display: flex;
        flex-direction: column;
        gap: 5px;
    }

    .newSetButton {
        text-decoration: none;
    }

    .newSetButton button {
        width: 100%;
    }

    .set {
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

    /* TODO: better selected and hover styling */
    .set.selected, .set:hover {
        background-color: var(--color-hover-background);
    }

    /* .set.default {
        border: 1px solid var(--color-background);
    } */

    .buttonDarkTwo {
        color: black;
        background-color: transparent;
    }

    .buttonDarkTwo:hover {
        background-color: var(--color-major);
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

    .minor {
        color: var(--color-minor);
        font-size: 0.9em;
    }

    :global(.paginationButton) {
        padding: 0.25em;
        border-radius: calc(infinity * 1px);
    }

    :global(.paginationButton.current) {
        text-decoration: underline;
    }
</style>

<main>
    {#if isOwner}
        <a href={`/wall/${wall.id}/new-set`} class="newSetButton">
            <!-- TODO: better styling -->
            <button class="buttonDarkInverse">
                <p>New Set</p>
            </button>
        </a>
    {/if}
    {#await sets}
        <p>Loading sets<LoadingEllipsis active={true}/></p>
    {:then setsCopy}
        <!-- TODO: if no sets, prompt to create one -->
        {#each setsCopy as set}
            <div
                class={
                    (selectedSet.id == set.id ? "set selected " : "set ")
                    + (wall.expand.current_set.id == set.id ? "default" : "")}
                on:click={() => selectedSet = set}
                on:keydown={() => selectedSet = set}
                role="button"
                tabindex="0"
            >
                <!-- TODO: consider loading thumbnail images -->
                <div>
                    <p>{set.name}</p>
                    <p class="minor">{(new Date(Date.parse(set.created))).toLocaleDateString()}</p>
                </div>
                <!-- TODO: if owner, option to make current -->
                <!-- TODO: if permissions (?), option to delete -->
                {#if isOwner}
                    {#if wall.expand.current_set.id != set.id}
                        <button class="buttonDarkTwo" on:click={() => updateDefaultSet(set.id)}>
                            Make Default
                        </button>
                    {/if}
                    <!-- TODO: onConfirm and onCancel -->
                    <ConfirmModal buttonText="Delete" buttonClass="buttonDeleteInverse" title="Confirm Deletion">
                        <div slot="message">
                            <p>Are you sure you want to delete this set?</p>
                            <p>This action will also delete this set's Routes and cannot be undone.</p>
                        </div>
                        <button slot="confirm" class="buttonDelete" on:click={() => deleteSet(set.id)}>Delete</button>
                    </ConfirmModal>
                {/if}
            </div>
        {/each}
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
    {/await}
</main>