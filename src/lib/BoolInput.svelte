<script lang="ts">
    import { createCheckbox, melt } from '@melt-ui/svelte'
	import CheckIcon from './icons/CheckIcon.svelte';

    export let labelText;
    export let value;
    $: value = $isChecked;

    const {
        elements: { root, input },
        helpers: { isChecked },
    } = createCheckbox({
        defaultChecked: value
    });
</script>

<style>
    label {
        display: block;
        font-size: 1.2em;
        color: var(--color-major);
    }

    input {
        font-size: 1.2em;
        padding: 0.25em 0.5em;
        border: 1px solid var(--color-major);
        border-radius: var(--primary-radius);
    }

    .switch {
        position: relative;
        display: inline-block;
        width: 1em;
        height: 1em;
        border-radius: var(--primary-radius);
        background-color: var(--color-major);
    }

    button {
        color: var(--color-major);
        background-color: var(--color-major);
        border: 1px solid var(--color-background);
        border-radius: var(--inset);
        padding: 0;
        height: 1.2em;
        width: 1.2em;
    }

    button:hover {
        background-color: var(--color-hover-background);
    }

    button.checked {
        background-color: var(--color-background);
    }

    button.checked:hover {
        background-color: var(--color-background-two);
    }
</style>

<!-- <label for="name" use:melt={$root}>{labelText}</label> -->
<!-- <input type="checkbox" id="name" class="switch" bind:checked={value} /> -->

<button use:melt={$root} id="checkbox" class={value ? "checked" : ""}>
    {#if value}
        <CheckIcon/>
    {/if}
    <input use:melt={$input}/>
</button>