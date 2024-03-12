<script lang="ts">
    export let value = "";
</script>

<style>
    input {
        font-size: 1.2em;
        width: 100%;
        padding: 0.25em 0.5em;
        border: 1px solid var(--color-major);
        border-radius: var(--primary-radius);
        box-sizing: border-box;
    }
</style>

<input type="text" id="this" name="this" bind:value/>