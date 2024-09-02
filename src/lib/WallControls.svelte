<script lang="ts">
    import type { Wall, Route } from './pocketbase.svelte';
    import Tabs from './Tabs.svelte';
    import { navTitle } from '../routes/global.svelte';
    import RouteList from './RouteList.svelte';

    type Props = {
        wall?: Wall;
        selectedRoute?: Route;
    };

    let { wall, selectedRoute = $bindable() }: Props = $props();

    $effect(() => {
        if (wall) {
            navTitle.suffix = wall?.name;
        }
        console.log(wall);
    });
</script>

<main>
    {#snippet routes()}
        <RouteList setId={wall?.current_set || ''} bind:selectedRoute />
    {/snippet}
    {#snippet sets()}
        <p>these are sets</p>
    {/snippet}
    <Tabs tabs={{ Routes: routes, Sets: sets }} />
</main>

<style>
    main {
        height: 100%;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
    }
</style>
