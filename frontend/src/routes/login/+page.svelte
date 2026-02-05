<script lang="ts">
	import { goto } from '$app/navigation';
	import { authStore } from '$lib/stores';
	import { loadConfig, updateConfig, type RuntimeConfig } from '$lib/runtimeConfig';

	let loginUsernameInput = $state('');
	let loginPasswordInput = $state('');
	let loginError = $state('');
	let isLoading = $state(false);
	let showPasswordDialog = $state(false);
	let showConfigDialog = $state(false);
	let adminPasswordInput = $state('');
	let adminPasswordError = $state('');
	let configApiBaseUrl = $state('');
	let configCameraUrl = $state('');
	let configError = $state('');
	let configLoading = $state(false);

	// Redirect if already logged in
	$effect(() => {
		if ($authStore.isLoggedIn) {
			goto('/');
		}
	});

	// Show password dialog first
	function openPasswordDialog() {
		showPasswordDialog = true;
		adminPasswordInput = '';
		adminPasswordError = '';
	}

	function closePasswordDialog() {
		showPasswordDialog = false;
		adminPasswordInput = '';
		adminPasswordError = '';
	}

	// Validate admin password and open config dialog
	async function handleAdminPasswordSubmit() {
		adminPasswordError = '';
		
		if (!adminPasswordInput) {
			adminPasswordError = 'Password is required';
			return;
		}

		// Check if password is correct (12345)
		if (adminPasswordInput === '12345') {
			closePasswordDialog();
			// Open config dialog
			showConfigDialog = true;
			configError = '';
			try {
				const currentConfig = await loadConfig();
				configApiBaseUrl = currentConfig.apiBaseUrl;
				configCameraUrl = currentConfig.cameraUrl;
			} catch (error: any) {
				configError = error.message || 'Failed to load current config';
			}
		} else {
			adminPasswordError = 'Incorrect password';
		}
	}

	function closeConfigDialog() {
		showConfigDialog = false;
		configError = '';
		configApiBaseUrl = '';
		configCameraUrl = '';
	}

	async function handleConfigSave() {
		configError = '';
		configLoading = true;

		if (!configApiBaseUrl || !configCameraUrl) {
			configError = 'Both API Base URL and Camera URL are required';
			configLoading = false;
			return;
		}

		try {
			await updateConfig({
				apiBaseUrl: configApiBaseUrl,
				cameraUrl: configCameraUrl
			});
			closeConfigDialog();
		} catch (error: any) {
			configError = error.message || 'Failed to save config';
		} finally {
			configLoading = false;
		}
	}

	async function handleLoginAttempt() {
		loginError = '';
		isLoading = true;

		if (!loginUsernameInput || !loginPasswordInput) {
			loginError = 'Username and password are required';
			isLoading = false;
			return;
		}

		// Simple delay to simulate login process
		await new Promise(resolve => setTimeout(resolve, 500));

		// Accept any credentials, set auth state, and redirect
		authStore.login(loginUsernameInput);
		await goto('/');
	}
</script>

<svelte:head>
	<title>Login - F80 Meter</title>
</svelte:head>

<div class="flex min-h-screen items-center justify-center bg-gray-100 px-4 py-12">
	<div class="w-full max-w-md space-y-8">
		<div>
			<img class="mx-auto h-16 w-auto" src="/f80_logowhite.png" alt="Logo" />
			<h2 class="mt-6 text-center text-3xl font-extrabold text-gray-900">
				Sign in to your account
			</h2>
		</div>

		<form class="mt-8 space-y-6" onsubmit={(e) => { e.preventDefault(); handleLoginAttempt(); }}>
			<div class="rounded-md shadow-sm">
				<input
					id="username"
					type="text"
					required
					bind:value={loginUsernameInput}
					class="relative block w-full appearance-none rounded-none rounded-t-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
					placeholder="Username"
					disabled={isLoading}
				/>
				<input
					id="password"
					type="password"
					required
					bind:value={loginPasswordInput}
					class="relative block w-full appearance-none rounded-none rounded-b-md border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-500 focus:z-10 focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
					placeholder="Password"
					disabled={isLoading}
				/>
			</div>

			{#if loginError}
				<p class="text-sm text-red-600">{loginError}</p>
			{/if}

			<div class="space-y-3">
				<button
					type="submit"
					disabled={isLoading}
					class="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					{#if isLoading}
						<span>Signing in...</span>
					{:else}
						Sign in
					{/if}
				</button>
				<button
					type="button"
					onclick={openPasswordDialog}
					disabled={isLoading}
					class="group relative flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
				>
					<svg
						class="w-4 h-4 mr-2"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
						/>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
						/>
					</svg>
					Configure API URLs
				</button>
			</div>
		</form>
	</div>
</div>

<!-- Admin Password Dialog -->
{#if showPasswordDialog}
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		role="dialog"
		aria-modal="true"
		aria-labelledby="password-dialog-title"
		onclick={(e) => { if(e.target === e.currentTarget) closePasswordDialog(); }}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				closePasswordDialog();
			}
		}}
	>
		<!-- Backdrop -->
		<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

		<!-- Dialog Container -->
		<div class="flex min-h-full items-center justify-center p-4">
			<div
				class="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-md"
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Header -->
				<div class="px-6 py-4 border-b border-gray-200">
					<h3 id="password-dialog-title" class="text-lg font-semibold text-gray-900">
						Admin Authentication
					</h3>
					<p class="mt-1 text-sm text-gray-500">
						Enter admin password to configure API URLs
					</p>
				</div>

				<!-- Content -->
				<div class="px-6 py-4 space-y-4">
					{#if adminPasswordError}
						<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
							<p class="text-sm">{adminPasswordError}</p>
						</div>
					{/if}

					<div>
						<label
							for="admin-password"
							class="block text-sm font-medium text-gray-700 mb-1"
						>
							Admin Password
						</label>
						<input
							id="admin-password"
							type="password"
							bind:value={adminPasswordInput}
							placeholder="Enter password"
							class="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							onkeydown={(e) => {
								if (e.key === 'Enter') {
									handleAdminPasswordSubmit();
								}
							}}
						/>
					</div>
				</div>

				<!-- Footer -->
				<div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
					<button
						type="button"
						onclick={closePasswordDialog}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={handleAdminPasswordSubmit}
						class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
					>
						Continue
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Config Dialog -->
{#if showConfigDialog}
	<div
		class="fixed inset-0 z-50 overflow-y-auto"
		role="dialog"
		aria-modal="true"
		aria-labelledby="config-dialog-title"
		onclick={(e) => { if(e.target === e.currentTarget) closeConfigDialog(); }}
		onkeydown={(e) => {
			if (e.key === 'Escape') {
				closeConfigDialog();
			}
		}}
	>
		<!-- Backdrop -->
		<div class="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>

		<!-- Dialog Container -->
		<div class="flex min-h-full items-center justify-center p-4">
			<div
				class="relative transform overflow-hidden rounded-lg bg-white shadow-xl transition-all w-full max-w-md"
				onclick={(e) => e.stopPropagation()}
			>
				<!-- Header -->
				<div class="px-6 py-4 border-b border-gray-200">
					<h3 id="config-dialog-title" class="text-lg font-semibold text-gray-900">
						Configure API URLs
					</h3>
					<p class="mt-1 text-sm text-gray-500">
						Update the API endpoints used by the application
					</p>
				</div>

				<!-- Content -->
				<div class="px-6 py-4 space-y-4">
					{#if configError}
						<div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
							<p class="text-sm">{configError}</p>
						</div>
					{/if}

					<div>
						<label
							for="api-base-url"
							class="block text-sm font-medium text-gray-700 mb-1"
						>
							API Base URL
						</label>
						<input
							id="api-base-url"
							type="text"
							bind:value={configApiBaseUrl}
							placeholder="http://127.0.0.1:8000"
							class="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							disabled={configLoading}
						/>
					</div>

					<div>
						<label
							for="camera-url"
							class="block text-sm font-medium text-gray-700 mb-1"
						>
							Camera URL
						</label>
						<input
							id="camera-url"
							type="text"
							bind:value={configCameraUrl}
							placeholder="http://127.0.0.1:8001"
							class="w-full px-3 py-2 bg-white text-gray-900 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
							disabled={configLoading}
						/>
					</div>
				</div>

				<!-- Footer -->
				<div class="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
					<button
						type="button"
						onclick={closeConfigDialog}
						disabled={configLoading}
						class="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						Cancel
					</button>
					<button
						type="button"
						onclick={handleConfigSave}
						disabled={configLoading}
						class="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
					>
						{#if configLoading}
							Saving...
						{:else}
							Save
						{/if}
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

