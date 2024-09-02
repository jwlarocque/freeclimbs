<script lang="ts">
    type Props = {
        active: boolean;
    }
    let { active }: Props = $props();
</script>

<style>
    span:not(.active) {
        opacity: 0;
    }

    .active > span {
        animation: blink 1s linear infinite;
    }

    span:nth-child(2) {
        animation-delay: 0.3333s;
    }

    span:nth-child(3) {
        animation-delay: 0.6666s;
    }

    @keyframes blink {
        33.33% {
            opacity: 1;
        }
    }
</style>

<span class={active ? "active" : ""}><span>.</span><span>.</span><span>.</span></span>
