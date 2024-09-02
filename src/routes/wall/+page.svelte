<script lang="ts">
    import { SvelteURLSearchParams } from 'svelte/reactivity';
    import { goto } from '$app/navigation';
    import { auth, getWall, getSetImageUrl, applyRoute } from '$lib/pocketbase.svelte';
    import type { Wall, Route, Hold } from '$lib/pocketbase.svelte';
    import Loading from '$lib/Loading.svelte';
    import Viewer from '$lib/Viewer.svelte';
    import WallControls from '$lib/WallControls.svelte';
    import ChevronDownIcon from '$lib/icons/ChevronDownIcon.svelte';

    let params = $state(new SvelteURLSearchParams(window.location.search));
    let wallPromise: Promise<Wall> = $state(getWall(auth, params?.get('id') || ''));
    let selectedRoute = $state<Route>();
    let showControls = $state(true);

    $inspect(selectedRoute);

    $effect(() => {
        goto(`/wall?${params.toString()}`);
        if (params.get('id')) {
            wallPromise = getWall(auth?.model?.id, params?.get('id') || '');
        }
    });
</script>

<main>
    {#await wallPromise}
        <p>Loading<Loading active={true} /></p>
    {:then wall}
        <div id="controls" class={showControls ? '' : 'hidden'}>
            <WallControls {wall} bind:selectedRoute />
            <button
                class="buttonDark"
                id="toggleControls"
                onclick={() => (showControls = !showControls)}
            >
                <ChevronDownIcon />
            </button>
        </div>
        <div id="viewer">
            <Viewer
                imageUrl={wall?.expand?.current_set
                    ? getSetImageUrl(wall?.expand?.current_set)
                    : undefined}
                holds={applyRoute(wall?.expand?.current_set?.holds || [], selectedRoute)}
            />
        </div>
    {:catch error}
        <p>Error: {error}</p>
    {/await}
</main>

<style>
    main {
        position: relative;
        box-sizing: border-box;
        width: 100%;
        height: 100%;
        display: flex;
        flex-wrap: wrap;
    }

    #controls {
        position: relative;
        flex: 1 1 20em;
        min-width: 20em;
        width: 20em;
        max-height: 100%;
        display: flex;
        flex-direction: column;
        box-shadow: var(--primary-shadow);
        border-radius: var(--primary-radius);
    }

    #toggleControls {
        position: absolute;
        right: 0;
        padding: 0.25em;
        visibility: hidden;
        transform: translateY(-100%);
        z-index: 1;
        border-bottom-left-radius: 0;
        border-bottom-right-radius: 0;
    }

    #viewer {
        display: flex;
        flex-direction: column;
        flex: 1 1 20em;
        min-width: 20em;
        width: 20em;
        max-height: 100%;
        min-height: 0;
    }

    @media (max-width: calc(40em + 2em + 15px)) {
        main {
            flex-direction: column-reverse;
            flex-wrap: nowrap;
        }

        #controls {
            width: 100%;
            flex: 0 0 auto;
            max-height: 50%;
        }

        #controls.hidden > :global(main) {
            display: none;
        }

        #controls.hidden #toggleControls {
            transform: translateY(-100%);
        }
        #controls.hidden #toggleControls > :global(svg) {
            transform: rotate(180deg);
        }
        #toggleControls {
            visibility: visible;
            transition: transform 0.1s ease-in-out;
        }

        #viewer {
            width: 100%;
            flex: 1 1 auto;
        }
    }
</style>
