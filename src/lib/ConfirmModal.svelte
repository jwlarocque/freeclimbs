<script lang="ts">
    import { Dialog, Separator, Label } from "bits-ui";
	import CloseIcon from "./icons/CloseIcon.svelte";

    export let buttonText = "";
    export let buttonClass;
    export let title = "";

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

    :global(.confirmModalButton > span:has(svg)) {
        line-height: 0;
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
                <span on:click={() => open = false} on:keypress={() => open = false} role="button" tabindex="-1">
                    <slot name="confirm"/>
                </span>
            </footer>
        </Dialog.Content>
    </Dialog.Portal>
</Dialog.Root>
