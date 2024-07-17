<script lang="ts">
    import { Dialog, Separator, Label } from "bits-ui";
	import CloseIcon from "./icons/CloseIcon.svelte";

    export let buttonText = "";
    export let buttonClass;
    export let title = "";
    export let message = "";
    export let confirmText = "Confirm";
    export let cancelText = "Cancel";
    export let onConfirm: () => void;
    export let onCancel: () => void;

    let open:boolean;
</script>

<style>
    h3 {
        margin: 0 0.5em 1em 0;
    }

    footer {
        display: flex;
        flex-direction: row;
        justify-content: space-around;
        align-items: center;
        gap: 1em;
        margin: 1em 0 0 0;
    }

    :global(.confirmModalButton) {
        margin: auto;
    }
</style>

<Dialog.Root bind:open>
    <Dialog.Trigger class={"confirmModalButton " + (buttonClass || "buttonLight")}>
        {#if buttonText}
            <p>{buttonText}</p>
        {:else}
            <slot name="button"/>
        {/if}
    </Dialog.Trigger>
    <Dialog.Portal>
        <Dialog.Overlay class="modalOverlay"/>
        <Dialog.Content class="sign modalContent">
            <header>
                <h3>{title}</h3>
                <Dialog.Close class="closeContainer">
                    <CloseIcon/>
                </Dialog.Close>
            </header>
            <slot name="message"/>
            <footer>
                <Dialog.Close class={buttonClass || "buttonLight"}>
                    <slot name="confirm"/>
                </Dialog.Close>
            </footer>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
