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
</style>

<Dialog.Root>
    <Dialog.Trigger class={buttonClass || "buttonLight"}>
        <p>{buttonText}</p>
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
                <Dialog.Close>
                    <slot name="confirm"/>
                </Dialog.Close>
            </footer>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
