<script lang="ts">
    import { createCheckbox, melt } from '@melt-ui/svelte'
	import CheckIcon from './icons/CheckIcon.svelte';
	import LoadingEllipsis from './LoadingEllipsis.svelte';

    export let value;
    let lastValue = value;
    export let onValueChange = (v) => {console.log(v)};
    let updating = false;
    export let title;

    $: value = $checked;
    $: if (value !== lastValue) {
        handleValueChange();
    }

    async function handleValueChange() {
        if (updating) return;
        updating = true;
        try {
            await onValueChange(value);
            lastValue = value;
        } catch (e) {
            $checked = lastValue;
            alert("Error updating value"); // TODO: better error message
            console.error(e);
        } finally {
            updating = false;
        }
    }

    const {
        elements: { root, input },
        states: { checked }
    } = createCheckbox({
        defaultChecked: value
    });
</script>

<style>
    input {
        font-size: 1em;
        padding: 0.25em 0.5em;
        border: 1px solid var(--color-major);
        border-radius: var(--primary-radius);
    }

    button {
        color: var(--color-major);
        background-color: var(--color-major);
        border: 1px solid var(--color-minor);
        border-radius: var(--inset);
        padding: 0;
        min-height: 26px;
        height: 26px;
        min-width: 26px;
        width: 26px;
        margin: auto;
    }

    button:hover {
        background-color: var(--color-hover-background);
    }

    button.disabled :global(span) {
        color: black;
    }

    button.checked {
        background-color: var(--color-background);
        border-color: var(--color-background);
    }

    button.checked:hover {
        background-color: var(--color-background-two);
        border-color: var(--color-background-two);
    }
</style>

<button use:melt={$root} id="checkbox" class={value ? "checked" : "" + (updating ? "disabled" : "")} title={title}>
    {#if updating}
        <LoadingEllipsis/>
    {:else}
        <CheckIcon/>
    {/if}
    <input use:melt={$input}/>
</button>