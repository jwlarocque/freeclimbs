<script lang="ts">
    import PageButtons from './PageButtons.svelte';
    import type { Route } from './pocketbase.svelte';
    import { getRoutes } from './pocketbase.svelte';

    const PAGE_SIZE = 30;

    type Props = {
        setId: string;
        selectedRoute?: Route;
    };
    let { setId, selectedRoute = $bindable() }: Props = $props();

    let routesSearch = $state({
        pageSize: PAGE_SIZE,
        page: 0,
        sort: 'created',
        desc: true,
        filter: '1 = 1'
    });
    let totalItems = $state(0);

    let routesPromise: Promise<Route[]> = $state(Promise.resolve([]));
    $effect(() => {
        routesPromise = loadRoutes(setId, routesSearch);
    });
    async function loadRoutes(
        setId: string,
        {
            pageSize,
            page,
            sort,
            desc,
            filter
        }: { pageSize: number; page: number; sort: string; desc: boolean; filter: string }
    ) {
        const result = await getRoutes(setId, pageSize, page + 1, sort, desc, filter);
        totalItems = result.totalItems;
        return result.items as unknown as Route[]; // TODO: fix this type hack
    }
</script>

<main>
    {#await routesPromise}
        <p>Loading...</p>
    {:then routes}
        {#each routes as route}
            <div
                class={selectedRoute?.id == route.id ? 'route selected' : 'route'}
                onclick={() => (selectedRoute = route)}
                onkeypress={() => (selectedRoute = route)}
                role="button"
                tabindex="0"
            >
                <p>{route.name}</p>
            </div>
        {/each}
    {/await}
    <PageButtons bind:page={routesSearch.page} {totalItems} pageSize={PAGE_SIZE} />
</main>

<style>
    .route {
        overflow: auto;
    }

    .route:hover {
        background-color: var(--background-hover);
    }

    .route.selected {
        background-color: var(--background-selected);
    }
</style>
