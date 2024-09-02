<script>
    import Nav from '$lib/Nav.svelte';

    const { children } = $props();
</script>

<Nav />
{@render children()}

<style>
    @font-face {
        font-family: 'Cooper';
        src: ('$lib/fonts/Cooper[wght].woff2') format('woff2');
    }

    :global(:root) {
        --color-background: #030408;
        --color-major: #fdf5ec;
        --color-minor: #9e9994;
        --primary-radius: 8px;
        --inset: 1em;
        --border-width: 1px;
        --background-gradient: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 2500 2500' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='0.1' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"),
            linear-gradient(0deg, rgba(3, 4, 8, 1) 0%, rgba(3, 4, 8, 1) 55%, rgba(8, 9, 14, 1) 100%);
        --background-nogradient: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 2500 2500' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='0.1' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"),
            rgba(3, 4, 8, 1);
        --background-nogradient-hover: url("data:image/svg+xml;utf8,%3Csvg viewBox='0 0 2500 2500' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='1' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' opacity='0.1' filter='url(%23noiseFilter)'/%3E%3C/svg%3E"),
            rgba(8, 9, 14, 1);
        --background-hover: rgba(199, 206, 255, 0.02);
        --background-selected: rgba(199, 206, 255, 0.05);
    }

    :global(body) {
        font-family: 'Cooper', serif;
        margin: 0;
        height: 100dvh;
        display: flex;
        flex-direction: column;
    }

    :global(body, .dark) {
        color: var(--color-major);
        background: rgb(3, 4, 8);
        background-image: var(--background-gradient);
    }

    :global(.rounded) {
        border-radius: var(--primary-radius);
    }

    :global(h1, h2, h3, h4, h5, h6, h1 a, h2 a, h3 a, h4 a, h5 a, h6 a, button) {
        font-family: 'Cooper', serif;
    }

    :global(p, a, ul, button, input) {
        font-size: 1.2em;
        text-decoration: none;
    }

    :global(button, .button) {
        line-height: 1;
        display: inline-flex;
        justify-content: space-evenly;
        vertical-align: middle;
        padding: 0.5em;
        text-align: center;
        cursor: pointer;
        border: none;
        border-radius: var(--primary-radius);
        color: var(--color-major);
        background: transparent;
    }
    :global(button p, button a) {
        margin: 0;
    }
    :global(.buttonDark) {
        background: var(--background-nogradient);
    }

    :global(.buttonDark:hover) {
        background: var(--background-nogradient-hover);
    }

    :global(button:hover, .button:hover, .buttonTransparent:hover) {
        background: var(--background-hover);
    }
</style>
