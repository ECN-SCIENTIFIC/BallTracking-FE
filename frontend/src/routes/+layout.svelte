<script lang="ts">
	import '../app.css';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import { authStore } from '$lib/stores';
	
	let { children } = $props();

	// Protect routes - redirect to login if not authenticated
	$effect(() => {
		// Allow access to login page without auth
		if ($page.url.pathname === '/login') {
			// Do nothing, allow access
			return;
		}
		
		// Redirect to login if not authenticated
		if (!$authStore.isLoggedIn) {
			goto('/login');
		}
	});
</script>

{@render children()}
