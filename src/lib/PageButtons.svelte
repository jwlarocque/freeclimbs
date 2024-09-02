<script lang="ts">
    const MAX_ITEMS = 8;
    const MAX_ADJ = MAX_ITEMS / 2;

    type Props = {
        page: number;
        totalItems: number;
        pageSize: number;
    };
    let { page = $bindable(), totalItems, pageSize }: Props = $props();

    // quick maths
    let pageCount = $derived(Math.ceil(totalItems / pageSize));
    let beforeEllipsis = $derived(pageCount > MAX_ITEMS && page >= MAX_ADJ);
    let afterEllipsis = $derived(pageCount > MAX_ITEMS && page < pageCount - MAX_ADJ);
    let numTotal = $derived(MAX_ITEMS - 2 * (beforeEllipsis ? 1 : 0) - 2 * (afterEllipsis ? 1 : 0));
    let from = $derived(
        Math.max(0, Math.min(page - Math.floor(numTotal / 2), pageCount - numTotal - 1))
    );
    let to = $derived(Math.min(pageCount - 1, page + numTotal - (page - from)));
</script>

<main>
    <button id="prev" disabled={page === 0} onclick={() => page--}>Prev</button>
    {#if beforeEllipsis}
        <button disabled={page === 0} onclick={() => (page = 0)}>1</button>
        <button disabled>...</button>
    {/if}
    {#each Array.from({ length: to - from + 1 }, (_, i) => i + from) as i}
        <button
            disabled={i === page}
            class={i === page ? 'current' : ''}
            onclick={() => (page = i)}
        >
            {i + 1}
        </button>
    {/each}
    {#if afterEllipsis}
        <button disabled>...</button>
        <button disabled={page === pageCount - 1} onclick={() => (page = pageCount - 1)}>
            {pageCount}
        </button>
    {/if}
    <button id="next" disabled={page === pageCount - 1} onclick={() => page++}>Next</button>
</main>

<style>
    main {
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .current {
        background-color: var(--background-selected);
        text-decoration: underline;
        text-decoration-thickness: 2px;
    }

    button {
        width: 2rem;
        line-height: 1;
        transition: all 0s;
    }

    button:disabled {
        cursor: auto;
        pointer-events: none;
    }

    button#prev,
    button#next {
        width: auto;
    }

    button#prev:disabled,
    button#next:disabled {
        opacity: 0.5;
    }
</style>
