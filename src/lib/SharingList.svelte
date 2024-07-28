<script lang="ts">
    import { pb, createShare, getShares, deleteShare } from "./pocketbase";
    import LoadingEllipsis from "./LoadingEllipsis.svelte";
    import CopyIcon from "./icons/CopyIcon.svelte";
    import DeleteIcon from "./icons/DeleteIcon.svelte";
	import ConfirmModal from "./ConfirmModal.svelte";
	import ChevronDownIcon from "./icons/ChevronDownIcon.svelte";
	import { onMount } from "svelte";
	import CopyButton from "./CopyButton.svelte";
	import CheckIcon from "./icons/CheckIcon.svelte";
	import BoolInput from "./BoolInput.svelte";

    export let wallId;

    let sharesPromise;
    let showUsers = {};

    async function setShareEditing(share, editing) {
        await pb.collection("shares").update(share.id, {
            wall: wallId,
            editing: editing
        });
    }

    // TODO: don't refresh the whole list on every change
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
        margin-top: 0;
    }

    .sharing {
        margin: 1em;
    }

    .shares {
        display: grid;
        grid-template-columns: auto auto auto auto;
        align-items: center;
        justify-items: start;
        gap: var(--inset);
    }

    .share {
        display: grid;
        grid-column: span 4;
        grid-template-columns: subgrid;
        justify-items: center;
        border-radius: var(--primary-radius);
        padding: var(--inset);
    }

    .share button, .sharing button {
        margin: auto;
        box-sizing: border-box;
    }

    .editingButton {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;
        gap: 0.5em;
    }

    #newShare {
        margin-top: 1em;
        width: 100%;
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
                            <a href={`/share?secret=${share.id}`}><p>Link</p></a>
                            <CopyButton value={`${window.location.origin}/share?secret=${share.id}`} buttonClass="buttonDark"/>
                        </div>
                        <span class="editingButton">
                            <BoolInput
                                value={share.editing}
                                title="{share.editing ? 'Disallow' : 'Allow'} Setting"
                                onValueChange={async (editing) => {await setShareEditing(share, editing); refreshShares();}}/>
                            <p>Allow Setting</p>
                        </span>
                        <ConfirmModal buttonClass="buttonDark" title="Users of this link">
                            <span slot="button" title="View Users">
                                {share?.expand?.users_shares_via_share.length || 0} {share?.expand?.users_shares_via_share.length == 1 ? "user" : "users"}
                            </span>
                            <div slot="message">
                                {#if share?.expand?.users_shares_via_share}
                                    {#each share?.expand?.users_shares_via_share as user_share}
                                    <!-- TODO: if you ever add usernames/nicknames, show them here -->
                                        <p>{user_share?.expand?.user?.username} ({user_share?.expand?.user?.email})</p>
                                    {/each}
                                {:else}
                                    <p>No users yet.</p>
                                {/if}
                            </div>
                        </ConfirmModal>
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
                            <button
                                slot="confirm"
                                class="buttonDelete"
                                on:click={async () => {await deleteShare(share.id); refreshShares();}}
                                on:keypress={async () => {await deleteShare(share.id); refreshShares();}}
                            >Delete</button>
                        </ConfirmModal> 
                    </div>
                {/each}
            </div>
        {/if}
    {:catch error}
        <p>Error: {error.message}</p>
    {/await}
    <button id="newShare" class="buttonDarkInverse" on:click={async () => {await createShare(wallId, false); refreshShares();}}>New Sharing Link</button>
</div>