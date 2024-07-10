<script>
	import { Select } from "bits-ui";

    export let prefix = "";
    export let options = [];
    export let selected;
</script>

<style>
    :global(.dropdown) {
        background-color: var(--color-major);
        z-index: 2;
    }

    :global(.dropdown[data-side="top"]) {
        margin-top: -0.5em;
    }
</style>

<Select.Root items={options} bind:selected={selected}>
    <Select.Trigger class="buttonDark">
        <p>{prefix}{selected.label}</p>
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