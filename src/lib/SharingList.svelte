<script lang="ts">
    import { pb, createShare, getShares, deleteShare } from "./pocketbase";
    import LoadingEllipsis from "./LoadingEllipsis.svelte";
    import CopyIcon from "./icons/CopyIcon.svelte";
    import DeleteIcon from "./icons/DeleteIcon.svelte";
	import ConfirmModal from "./ConfirmModal.svelte";
	import ChevronDownIcon from "./icons/ChevronDownIcon.svelte";
	import { onMount } from "svelte";
	import CopyButton from "./CopyButton.svelte";

    export let wallId;

    let sharesPromise;
    let showUsers = {};

    async function setShareEditing(share, editing) {
        await pb.collection("shares").update(share.id, {
            wall: wallId,
            editing: editing
        });
    }

    async function refreshShares() {
        sharesPromise = getShares(wallId);
    }

    onMount(() => {
        refreshShares();
    });
</script>

<style>
    h3 {
        color: black;
        font-size: 1.2em;
        text-align: center;
    }

    .sharing {
        margin: 1em;
    }

    .shares {
        display: grid;
        grid-template-columns: 2fr 2fr 0fr;
        align-items: center;
        justify-items: start;
        gap: 1em;
    }

    .share {
        display: grid;
        grid-column: span 3;
        grid-template-columns: subgrid;
        justify-items: center;
        border-radius: var(--primary-radius);
        padding: var(--inset);
    }

    .share button, .sharing button {
        margin: auto;
    }

    .users {
        grid-column: span 3;
        width: 100%;
    }

    .users > button {
        width: 100%;
        margin: 0;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        margin: 5px 0;
    }

    .users span {
        transition: rotate 1s ease-in-out;
    }
</style>

<div class="sharing">
    <h3>Sharing</h3>
    {#await sharesPromise}
        <LoadingEllipsis active={true}/>
    {:then shares}
        {#if !shares || shares.length == 0}
            <p>No sharing links yet.</p>
        {:else}
            <div class="shares">
                {#each shares as share, i}
                    <div class="share">
                        <div style="display: flex; flex-direction: row;">
                            <a href={`/share/${share.id}`}><p>Sharing Link</p></a>
                            <CopyButton value={`${window.location.origin}/share/${share.id}`}/>
                        </div>
                        <button
                            class="buttonDark"
                            title="{share.editing ? 'Disallow' : 'Allow'} setting"
                            on:click={async () => {await setShareEditing(share, !share.editing); refreshShares();}}
                        >
                            Allows: {share.editing ? "setting" : "viewing"}
                        </button>
                        <!-- TODO: FIX DELETE - the nested buttons are not okay -->
                        <ConfirmModal
                            buttonClass="buttonDelete"
                            title={`Delete sharing link used by ${share?.expand?.users_shares_via_share.length || 0} ${share?.expand?.users_shares_via_share.length == 1 ? "person" : "people"}?`}
                        >
                            <span slot="button">
                                <DeleteIcon/>
                            </span>
                            <div slot="message">
                                <p>Everyone using this link will lose access until you send them a new one.</p>
                                <p>This cannot be undone.</p>
                            </div>
                            <button slot="confirm" class="buttonDelete" on:click={async () => {await deleteShare(share.id); refreshShares();}}>Delete</button>
                        </ConfirmModal>
                        <div class="users">
                            <button class="buttonDark" on:click={() => showUsers[share.id] = !(showUsers[share.id] ?? false)}>
                                {share?.expand?.users_shares_via_share.length || 0} {share?.expand?.users_shares_via_share.length == 1 ? "user" : "users"}
                                <span class="{showUsers[share.id] ? "flipped" : ""}">
                                    <ChevronDownIcon/>
                                </span>
                            </button>
                            {#if showUsers[share.id] && share?.expand?.users_shares_via_share}
                                {#each share?.expand?.users_shares_via_share as user_share}
                                    <p>{user_share?.expand?.user?.username}</p>
                                {/each}
                            {/if}
                        </div>
                    </div>
                {/each}
            </div>
        {/if}
    {:catch error}
        <p>Error: {error.message}</p>
    {/await}
    <button class="buttonDarkInverse" on:click={async () => {await createShare(wallId, false); refreshShares();}}>New Sharing Link</button>
</div>