<script lang="ts">
    import { Dialog, Separator, Label } from "bits-ui";

    export let buttonText = "";
    export let buttonDark = false;
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
    <Dialog.Trigger  class={buttonDark ? "buttonDark" : "buttonLight"}>
        <p>{buttonText}</p>
    </Dialog.Trigger>
    <Dialog.Portal>
        <Dialog.Overlay class="modalOverlay"/>
        <Dialog.Content class="sign modalContent">
            <header>
                <h3>{title}</h3>
                <Dialog.Close class="closeContainer">
                    <svg class="close" xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 -960 960 960" width="24">
                        <path d="m256-200-56-56 224-224-224-224 56-56 224 224 224-224 56 56-224 224 224 224-56 56-224-224-224 224Z"/>
                    </svg>
                </Dialog.Close>
            </header>
            <slot name="message"/>
            <footer>
                <slot name="confirm"/>
            </footer>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
