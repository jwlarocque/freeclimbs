<script lang="ts">
    import LoadingEllipsis from "$lib/LoadingEllipsis.svelte";
	import Nav from "$lib/Nav.svelte";

    let editorState;
</script>

<style>
    main {
        min-height: 0;
        flex: 1 1 auto;
        width: 100%;
    }
</style>

<Nav/>
<main>
    <slot></slot>
</main>