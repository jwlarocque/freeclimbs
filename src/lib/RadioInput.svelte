<script lang="ts">
    import { RadioGroup, Label } from "bits-ui";

    export let options;
    export let value;

    let intermediaryValue = value;

    $: value = coerceBoolean(intermediaryValue);

    function coerceBoolean(newValue) {
        if (newValue == "true") {
            return true;
        } else if (newValue == "false") {
            return false;
        } else {
            return newValue;
        }
    }
</script>

<style>
    /* TODO: probably move styles to global file */
    :global(.radioGroup) {
        display: flex;
        flex-direction: row;
        flex-wrap: wrap;
        gap: 1em;
    }

    :global(.radioGroupItem) {
        display: flex;
        flex-direction: row;
        align-items: center;
        gap: 0.5em;
        background-color: transparent;
        color: var(--color-major);
    }

    :global(.indicator) {
        display: inline-block;
        width: 1em;
        height: 1em;
        border: 1px solid var(--color-major);
        border-radius: var(--primary-radius);
        box-sizing: border-box;
        transition: border-width 0.1s ease-in-out;
    }
    
    :global(.checked) {
        border-width: 0.3em;
    }
</style>

<RadioGroup.Root bind:value={intermediaryValue} class="radioGroup">
    {#each options as option}
        <RadioGroup.Item value={option.value} class="radioGroupItem">
            <RadioGroup.ItemIndicator class={option.value == value ? "indicator checked" : "indicator"} />
            <Label.Root>{option.label}</Label.Root>
        </RadioGroup.Item>
    {/each}
</RadioGroup.Root>