<script lang="ts">
	import favicon from '$lib/assets/favicon.svg';
	import '../app.css';
	let { children } = $props();
	export const prerender = true;
	export const ssr = false;
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}
