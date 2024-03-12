<script lang="ts">
    import { createLabel, createSwitch, melt } from '@melt-ui/svelte'

    export let labelText;
    export let value = false;

    const {
        elements: { root }
    } = createLabel();
</script>

<style>
    label {
        display: block;
        font-size: 1.2em;
        color: var(--color-major);
    }

    input {
        font-size: 1.2em;
        width: 100%;
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
    }

</style>

<label for="name" use:melt={$root}>{labelText}</label>
<input type="checkbox" id="name" class="switch" bind:checked={value} />