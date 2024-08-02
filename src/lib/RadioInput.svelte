<script lang="ts">
    import { RadioGroup, Label } from "bits-ui";

    export let options;
    export let value;
    export let buttonClass: string = "light";
    export let direction = "row";

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
    }

    :global(.radioGroupItem.light) {
        color: var(--color-major);
    }

    :global(.radioGroupItem.dark) {
        color: black;
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

    :global(.indicator.light) {
        border-color: var(--color-major);
    }

    :global(.indicator.dark) {
        border-color: black;
    }
    
    :global(.checked) {
        border-width: 0.3em;
    }
</style>

<RadioGroup.Root bind:value={intermediaryValue} class="radioGroup">
    {#each options as option}
        <RadioGroup.Item value={option.value} class={"radioGroupItem " + buttonClass}>
            <RadioGroup.ItemIndicator
                class={(option.value == value ? "indicator checked " : "indicator ") + buttonClass}
            ></RadioGroup.ItemIndicator>
            <Label.Root>{option.label}</Label.Root>
        </RadioGroup.Item>
    {/each}
</RadioGroup.Root>