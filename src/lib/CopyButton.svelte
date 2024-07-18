<script lang="ts">
    import CopyIcon from "./icons/CopyIcon.svelte";
    import CheckIcon from "./icons/CheckIcon.svelte";

    export let value:string;
    export let buttonClass:string = "buttonLight"

    let copied = false;

    async function copy() {
        try {
            await navigator.clipboard.writeText(value);
            copied = true;
            let copyInterval = setInterval(() => {
                clearInterval(copyInterval);
                copied = false;
            }, 1000);
        } catch (e) {
            console.error(e);
        }
    }
</script>

<style>
    button {
        margin: auto;
    }
</style>

<button class={buttonClass} on:click={copy}>
    {#if copied}
        <CheckIcon/>
    {:else}
        <CopyIcon/>
    {/if}
</button>