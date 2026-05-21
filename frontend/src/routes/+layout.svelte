<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores';
	// import SideNavbar from '$lib/components/SideNavbar.svelte';

	let { children } = $props();

	$effect(() => {
		if ($page.url.pathname === '/login') {
			return;
		}
		if (!$authStore.isLoggedIn) {
			goto('/login');
		}
	});

	const isLoginPage = $derived($page.url.pathname === '/login');
	const showAppShell = $derived($authStore.isLoggedIn && !isLoginPage);
	// const isDashboard = $derived(
	// 	$page.url.pathname === '/' || $page.url.pathname.startsWith('/faja')
	// );
</script>

{#if showAppShell}
	<section class="flex h-screen min-h-0 w-full overflow-hidden bg-gray-900">
		<!-- <SideNavbar showBallTrackingLayoutControls={isDashboard} /> -->
		<main class="flex-1 min-h-0 min-w-0 overflow-hidden">
			{@render children()}
		</main>
	</section>
{:else}
	{@render children()}
{/if}
