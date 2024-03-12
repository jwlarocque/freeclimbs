<script>
	import ConfirmModal from '$lib/ConfirmModal.svelte';
	import EditWall from '$lib/EditWall.svelte';
    import SetPicker from '$lib/SetPicker.svelte';
    import LoadingEllipsis from '$lib/LoadingEllipsis.svelte';
	import RouteViewer from '$lib/RouteViewer.svelte';
    import { pb } from '$lib/pocketbase.ts';

    export let data;

    let imageUrl;
    let doLoadwall = loadWall();
    let deleting = false;

    async function loadWall() {
        const record = await pb.collection("walls").getOne(
            data.slug, {
                expand: "current_set"
            });
        console.log(record);
        if (record && record?.expand?.current_set) {
            imageUrl = `/api/files/${record.expand.current_set.collectionId}/${record.expand.current_set.id}/${record.expand.current_set.image}`;
        }
        return record;
    }

    async function deleteWall(id) {
        deleting = true;
        try {
            await pb.collection("walls").delete(id);
            window.location.href = "/";
        } catch (error) {
            deleting = false;
            console.error(error);
        }
    }
</script>

<style>
    main {
        position: relative;
        box-sizing: border-box;
        min-height: 0;
        max-height: 100%;
        height: 100%;
        display: flex;
        flex-direction: column;
        padding: 0;
        background-color: var(--color-major);
        overflow: hidden;
    }

    header {
        box-sizing: border-box;
        max-width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        padding: 1em;
        width: 100%;
        gap: 1em;
    }

    header > div {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1em;
    }

    h3 {
        /* font-size: min(4em, 10vw); */
        color: var(--color-background);
        margin: 0;
    }

    p {
        /* color: var(--color-minor); */
        margin: 0;
    }

    #content {
        background-color: var(--color-background);
        border-radius: calc(var(--primary-radius) - 5px);
        overflow: hidden;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
        gap: 5px;
        height: 100%;
    }

    #content p {
        color: var(--color-major);
    }

</style>

<main class="sign">
    {#await doLoadwall}
        <header>
            <h3>Loading Wall<LoadingEllipsis active={true}/></h3>
        </header>
    {:then wall}
            <header>
                <SetPicker currentSet={wall?.expand?.current_set} />
                <h3>{wall.name}</h3>
                {#if pb.authStore.model.id == wall.owner}
                    <div>
                        <EditWall buttonDark={true} wallId={wall.id} data={wall} onUpdate={() => {doLoadwall = loadWall()}}/>
                        <ConfirmModal buttonText="Delete" buttonDark={true} title="Confirm Deletion">
                            <div slot="message">
                                <p>Are you sure you want to delete this wall?</p>
                                <p>This action will also delete this wall's Sets and Routes and cannot be undone.</p>
                            </div>
                            <button slot="confirm" class="buttonDelete" on:click={() => deleteWall(wall.id)}>Delete</button>
                        </ConfirmModal>
                    </div>
                {/if}
                <!-- TODO: if owner, new set and settings -->
            </header>
            <div id="content">
                <!-- TODO: list of routes -->
                <RouteViewer set={wall?.expand?.current_set} route={null} panzoomEnabled={true}/>
                <!-- <img id="wallImg" src={imageUrl} alt="the climbing wall you uploaded"/> -->
            </div>
    {:catch error}
        <header>
            <h3>Error:</h3>
        </header>
        <div id="content">
            {#if error.status == 404}
                <p>Wall not found. This wall may not exist or you may not have permission to view it.</p>
            {:else}
                <p>{error.message}</p>
            {/if}
        </div>
    {/await}
</main>