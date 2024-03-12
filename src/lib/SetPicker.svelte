<script lang="ts">
    import { DropdownMenu } from "bits-ui";

    export let currentSet = null;
</script>

<style>
    :is(.sign) {
        margin-top: 1em;
    }
</style>

<DropdownMenu.Root>
    <DropdownMenu.Trigger class="buttonDark">
        {#if currentSet}
            Current Set: {currentSet?.name}
        {/if}
    </DropdownMenu.Trigger>
    <DropdownMenu.Content class="sign">
        <DropdownMenu.Item>New Set</DropdownMenu.Item>
        <DropdownMenu.Label>
            <p>Existing Sets</p>
        </DropdownMenu.Label>
    </DropdownMenu.Content>
</DropdownMenu.Root>
