<script>
	import { Select } from "bits-ui";

    export let prefix = "";
    export let options = [];
    export let selected;
    export let buttonClass = "buttonDark";
    export let defaultLabel = "";
    export let onChange = (x) => {};
</script>

<style>
    :global(.dropdown) {
        background-color: var(--color-major);
        color: black;
        z-index: 2;
    }

    :global(.dropdown[data-side="top"]) {
        margin-top: -0.5em;
    }
</style>

<Select.Root items={options} bind:selected={selected} onSelectedChange={onChange}>
    <Select.Trigger class={buttonClass}>
        <p>{prefix}{selected?.label || defaultLabel}</p>
    </Select.Trigger>
    <Select.Content class="dropdown">
        {#each options as option}
            <Select.Item value={option.value} label={option.label}>
                <p>{option.label}</p>
            </Select.Item>
        {/each}
    </Select.Content>
    <!-- <Select.Input/> -->
</Select.Root>