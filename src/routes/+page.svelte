<script lang="ts">
    import { authStore, pb } from '$lib/pocketbase';
    import { goto } from "$app/navigation";

    async function getAllWalls() {
        const res = await pb.collection("walls").getFullList({
            sort: "-created",
            expand: "current_set"
        });
        console.log(res);
        return res
    }
</script>

<style>
    h3 {
        width: 100%;
        text-align: center;
    }

    #walls {
        display: grid;
        grid-template-columns: 100px 1fr;
        gap: var(--inset);
        background-color: var(--color-major);
        padding: var(--inset);
        border-radius: var(--primary-radius);
        max-width: 40em;
        margin: auto;
    }

    .wall {
        display: grid;
        grid-template-columns: subgrid;
        grid-column: span 2;
        align-items: center;
        justify-content: space-between;
        gap: 1em;
        position: relative;
        cursor: pointer;
        border-radius: var(--primary-radius);
        padding: 0 1em 0 0;
        transition: background-color 0.1s ease-in-out;
        overflow: hidden;
    }

    .wall h4 {
        color: black;
        font-size: 1.2em;
    }

    .placeholder {
        height: 100px;
        width: 100px;
    }

    .wall img {
        max-height: 100%;
        object-fit: contain;
    }

    .wall:hover {
        background-color: var(--color-hover-background);
    }
</style>

<main>
    <h3><a href="/wall/demo/edit-set">Hold Detection Demo</a></h3>
    <br/>
    <h3>Walls</h3>
    {#await getAllWalls()}
        <p>Loading walls...</p>
    {:then walls}
        <div id="walls">
            {#each walls as wall}
                <!-- <a href={`/wall/${wall.id}`}> -->
                    <!-- svelte-ignore a11y-click-events-have-key-events -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div class="wall" on:click={() => goto(`/wall/${wall.id}`)}>
                        {#if wall.current_set}
                            <img src={`/api/files/${wall?.expand?.current_set?.collectionId}/${wall?.expand?.current_set?.id}/${wall?.expand?.current_set?.image}?thumb=100x100`} alt=""/>
                        {:else}
                            <div class="placeholder"></div>
                        {/if}
                        <h4>{wall.name}</h4>
                    </div>
                <!-- </a> -->
            {/each}
        </div>
    {/await}
</main>