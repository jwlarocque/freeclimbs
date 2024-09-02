<script lang="ts">
    import { createDialog, melt } from "@melt-ui/svelte";
	import type { Snippet } from "svelte";

    const {
        elements: { trigger, portalled, overlay, content, title, description, close },
        states: { open }
    } = createDialog();

    interface Props {
        titleText?: string;
        button: Snippet<[any]>;
        contents?: Snippet<[any]>; // TODO: Rune type?
    }
    let { titleText, button, contents }: Props = $props();
</script>

<style>
    .overlay {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background-color: rgba(0, 0, 0, 0.5);
        z-index: 10;
    }

    .content {
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 11;
        border: 3px solid var(--color-major);
        padding: var(--inset);
        min-width: 20em;
        max-width: calc(100% - 2em)
    }

    .content :global(h3) {
        text-align: center;
    }
</style>

{@render button(open)}

{#if $open}
    <div use:portalled>
        <div class="overlay" use:overlay></div>
        <div class="content dark rounded" use:content>
            {#if titleText}
                <h3 class="title" use:title>{titleText}</h3>
            {/if}
            {#if contents}
                {@render contents(open)}
            {:else}
                <p>no content</p>
            {/if}
        </div>
    </div>
{/if}