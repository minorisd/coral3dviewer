<script lang="ts">
    import { onMount } from 'svelte';
    import VRScene from '$lib/three/VRScene';

    let container: HTMLDivElement;

    onMount(() => {
        new VRScene(container);
    });
</script>

<div bind:this={container}></div>

<style>
    div {
        width: 100vw;
        height: 100vh;
        overflow: hidden;
    }

    :global(body) {
        margin: 0;
        overflow: hidden;
    }
</style>