<script lang="ts">
	import { fade, slide } from 'svelte/transition';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { authStore, languageStore, translations } from '$lib/stores';
	import { isNavbarCollapsed } from '$lib/stores/navbarStore';
	import { APP_SWITCHER_INTERACTIVE } from '$lib/config/appSwitcher';
	import LanguageToggle from '$lib/components/LanguageToggle.svelte';

	let {
		showBallTrackingLayoutControls = false
	}: {
		showBallTrackingLayoutControls?: boolean;
	} = $props();

	type AppStatus = 'active' | 'coming-soon' | 'maintenance';
	interface SwitcherApp {
		id: string;
		name: string;
		subtitle: string;
		status: AppStatus;
		logoSrc?: string;
		abbr: string;
	}

	let isDropdownOpen = $state(false);
	let showAppMenu = $state(false);
	let activeAppId = $state('ball-dtwin');
	const userAvatar = '/avatar_placeholder.png';

	const switcherApps: SwitcherApp[] = [
		{
			id: 'ball-dtwin',
			name: 'Ball Tracking',
			subtitle: 'Ball Charge Digital Twin',
			status: 'active',
			abbr: 'BT'
		},
		{
			id: 'gemelo-digital',
			name: 'DTwin',
			subtitle: 'SAG Mill Digital Twin',
			status: 'coming-soon',
			logoSrc: '/dtlogo.svg',
			abbr: 'GD'
		},
		{
			id: 'f80-meter',
			name: 'F80 Meter',
			subtitle: 'Particle Size Analyzer',
			status: 'coming-soon',
			logoSrc: '/f80logo.svg',
			abbr: 'F80'
		},
		{
			id: 'impact-finder',
			name: 'Impact Finder',
			subtitle: 'Mill Impact Analyzer',
			status: 'coming-soon',
			logoSrc: '/iflogoshort.svg',
			abbr: 'IF'
		},
		{
			id: 'perfect-blend',
			name: 'Perfect Blend',
			subtitle: 'Feed Blend Optimizer',
			status: 'coming-soon',
			abbr: 'PB'
		}
	];

	const statusLabel: Record<AppStatus, string> = {
		active: 'Active',
		'coming-soon': 'Coming soon',
		maintenance: 'Maintenance'
	};

	const statusDotColor: Record<AppStatus, string> = {
		active: '#10b981',
		'coming-soon': '#6b7280',
		maintenance: '#f59e0b'
	};

	const t = $derived(translations[$languageStore]);
	const isLoggedIn = $derived($authStore.isLoggedIn);
	const currentUserName = $derived($authStore.username ?? t.guest);
	const currentUserRole = $derived($languageStore === 'es' ? 'Básico' : 'Basic');
	const logoutLabel = $derived($languageStore === 'es' ? 'Cerrar sesión' : 'Logout');
	const activeApp = $derived(
		switcherApps.find((app) => app.id === activeAppId) ?? switcherApps[0]
	);

	function toggleCollapse() {
		isNavbarCollapsed.update((collapsed) => !collapsed);
		showAppMenu = false;
		isDropdownOpen = false;
	}

	function toggleDropdown() {
		isDropdownOpen = !isDropdownOpen;
		if (isDropdownOpen) showAppMenu = false;
	}

	function closeDropdown() {
		isDropdownOpen = false;
	}

	function toggleAppMenu() {
		if (!APP_SWITCHER_INTERACTIVE) return;
		showAppMenu = !showAppMenu;
		if (showAppMenu) closeDropdown();
	}

	function closeAppMenu() {
		showAppMenu = false;
	}

	function selectApp(appId: string) {
		activeAppId = appId;
		closeAppMenu();
	}

	function handleResize() {
		isNavbarCollapsed.handleResize();
		closeDropdown();
		closeAppMenu();
	}

	function handleLogout() {
		authStore.logout();
		closeDropdown();
		goto('/login');
	}

	function clickOutside(node: HTMLElement) {
		const handleClick = (event: MouseEvent) => {
			if (
				node &&
				!node.contains(event.target as Node) &&
				!(event.target as HTMLElement).closest('.user-profile-toggle')
			) {
				closeDropdown();
			}
		};
		document.addEventListener('click', handleClick, true);
		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	function clickOutsideAppMenu(node: HTMLElement) {
		const handleClick = (event: MouseEvent) => {
			if (
				node &&
				!node.contains(event.target as Node) &&
				!(event.target as HTMLElement).closest('.app-switcher-toggle')
			) {
				closeAppMenu();
			}
		};
		document.addEventListener('click', handleClick, true);
		return {
			destroy() {
				document.removeEventListener('click', handleClick, true);
			}
		};
	}

	onMount(() => {
		if (browser) {
			isNavbarCollapsed.initialize();
			window.addEventListener('resize', handleResize);
			return () => window.removeEventListener('resize', handleResize);
		}
	});
</script>

<nav
	class="h-screen shrink-0 flex flex-col bg-gray-800 text-white transition-all duration-300 ease-in-out overflow-hidden {$isNavbarCollapsed
		? 'w-20'
		: 'w-64'}"
	aria-label="Application sidebar"
>
		<div class="p-4">
			<div class="flex items-center mb-8 min-h-11 {$isNavbarCollapsed ? 'justify-center' : 'gap-2'}">
				{#if !$isNavbarCollapsed}
					<div class="relative flex-1 min-w-0">
						<button
							type="button"
							class="app-switcher-toggle h-11 rounded-lg border border-white/15 bg-white/5 transition-colors text-left w-full max-w-full px-3 {APP_SWITCHER_INTERACTIVE
								? 'hover:bg-white/10'
								: 'cursor-default opacity-95 disabled:opacity-95 disabled:hover:bg-white/5'}"
							disabled={!APP_SWITCHER_INTERACTIVE}
							onclick={toggleAppMenu}
							aria-label={APP_SWITCHER_INTERACTIVE ? 'Select application' : activeApp.name}
							aria-haspopup={APP_SWITCHER_INTERACTIVE ? 'menu' : undefined}
							aria-expanded={APP_SWITCHER_INTERACTIVE ? showAppMenu : undefined}
							title={activeApp.name}
						>
							<div class="flex items-center gap-2 w-full">
								<div class="relative h-7 w-7 shrink-0">
									<div class="h-7 w-7 rounded-md bg-white flex items-center justify-center overflow-hidden">
										{#if activeApp.logoSrc}
											<img src={activeApp.logoSrc} alt={activeApp.name} class="h-5 w-5 object-contain" />
										{:else}
											<span class="text-[10px] font-bold text-gray-700">{activeApp.abbr}</span>
										{/if}
									</div>
									<span
										class="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-gray-800"
										style="background: {statusDotColor[activeApp.status]};"
										aria-label={statusLabel[activeApp.status]}
										title={statusLabel[activeApp.status]}
									></span>
								</div>
								<div class="min-w-0 flex-1">
									<p class="text-sm font-semibold truncate">{activeApp.name}</p>
								</div>
								{#if APP_SWITCHER_INTERACTIVE}
									<span
										class="material-symbols-outlined leading-none text-gray-300"
										style="font-size: 16px; font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 20;"
									>
										expand_all
									</span>
								{/if}
							</div>
						</button>

						{#if APP_SWITCHER_INTERACTIVE && showAppMenu}
							<div
								use:clickOutsideAppMenu
								class="absolute top-full left-0 right-0 mt-2 bg-gray-700 rounded-lg overflow-hidden shadow-lg z-30 border border-white/10"
							>
								{#each switcherApps as app}
									<button
										type="button"
										class="w-full text-left flex items-center gap-2 px-3 py-2 hover:bg-gray-600 transition-colors {activeAppId === app.id ? 'bg-gray-600' : ''}"
										onclick={() => selectApp(app.id)}
									>
										<div class="relative h-7 w-7 shrink-0">
											<div class="h-7 w-7 rounded-md bg-white flex items-center justify-center overflow-hidden">
												{#if app.logoSrc}
													<img src={app.logoSrc} alt={app.name} class="h-5 w-5 object-contain" />
												{:else}
													<span class="text-[10px] font-bold text-gray-700">{app.abbr}</span>
												{/if}
											</div>
											<span
												class="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-gray-700"
												style="background: {statusDotColor[app.status]};"
												aria-label={statusLabel[app.status]}
												title={statusLabel[app.status]}
											></span>
										</div>
										<div class="min-w-0 flex-1">
											<p class="text-sm text-white truncate">{app.name}</p>
											<p class="text-xs text-gray-300 truncate">{app.subtitle}</p>
										</div>
									</button>
								{/each}
							</div>
						{/if}
					</div>
				{/if}

				<button
					type="button"
					aria-label="Toggle Collapse"
					class="inline-flex h-10 w-10 items-center justify-center self-center rounded-lg hover:bg-gray-700 transition-colors"
					onclick={toggleCollapse}
				>
					<span class="material-symbols-outlined text-[20px] leading-none">
						{$isNavbarCollapsed ? 'side_navigation' : 'left_panel_close'}
					</span>
				</button>
			</div>

		</div>

		<!--
		{#if showBallTrackingLayoutControls && !$isNavbarCollapsed}
			<div class="flex-1 min-h-0 border-t border-gray-700 bg-slate-900/20 overflow-hidden">
				<SidebarPanel {showBallTrackingLayoutControls} />
			</div>
		{:else}
			<div class="flex-grow"></div>
		{/if}
		-->
		<div class="flex-grow"></div>

		<div class="m-2 border-gray-700 relative">
			<div
				class="flex items-center justify-between py-2 px-3 rounded-xl hover:bg-gray-700 cursor-pointer transition-colors user-profile-toggle"
				onclick={toggleDropdown}
				role="button"
				tabindex="0"
				onkeydown={(e) => e.key === 'Enter' && toggleDropdown()}
			>
				<div class="flex items-center overflow-hidden">
					<div
						class="flex-shrink-0 h-8 w-8 rounded-full bg-gray-400 overflow-hidden {$isNavbarCollapsed
							? 'mx-auto'
							: 'mr-3'} transition-all duration-300 ease-in-out"
					>
						<img
							src={userAvatar}
							alt={currentUserName}
							class="h-full w-full object-cover"
						/>
					</div>
					<div
						class="overflow-hidden transition-all duration-300 ease-in-out {$isNavbarCollapsed
							? 'ml-0'
							: 'ml-3'}"
						style="max-width: {$isNavbarCollapsed
							? '0px'
							: '150px'}; opacity: {$isNavbarCollapsed ? '0' : '1'};"
					>
						<div class="font-semibold truncate whitespace-nowrap">{currentUserName}</div>
						<div class="text-sm text-gray-300 truncate whitespace-nowrap">{currentUserRole}</div>
					</div>
				</div>
				<div class="transform transition-transform duration-300 {isDropdownOpen ? 'rotate-180' : ''}">
					{#if !$isNavbarCollapsed}
						<div in:fade={{ delay: 300, duration: 150 }} out:fade={{ duration: 0 }}>
							<span
								class="material-symbols-outlined leading-none"
								style="font-size: 20px; font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;"
							>
								expand_less
							</span>
						</div>
					{/if}
				</div>
			</div>

			{#if isDropdownOpen && !$isNavbarCollapsed}
				<div
					use:clickOutside
					class="absolute bottom-full left-0 right-0 mx-2 bg-gray-700 rounded-t-lg overflow-hidden shadow-lg z-40"
					transition:slide={{ duration: 200 }}
				>
					<ul class="py-1">
						<li>
							<LanguageToggle />
						</li>
						<li class="border-t border-gray-600 mx-2 my-1"></li>
						{#if isLoggedIn}
							<li>
								<button
									type="button"
									class="w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-gray-600 transition-colors"
									onclick={handleLogout}
								>
									<span
										class="material-symbols-outlined leading-none"
										style="font-size: 20px; font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;"
									>
										logout
									</span>
									{logoutLabel} ({currentUserName})
								</button>
							</li>
						{/if}
					</ul>
				</div>
			{/if}

			{#if isDropdownOpen && $isNavbarCollapsed}
				<div
					use:clickOutside
					class="fixed left-20 top-auto bottom-20 bg-gray-700 rounded-lg overflow-hidden shadow-lg z-50"
					style="min-width: 200px;"
					transition:slide={{ duration: 200 }}
				>
					<div class="p-4 border-b border-gray-600">
						<div class="font-semibold">{currentUserName}</div>
						<div class="text-sm text-gray-300">{currentUserRole}</div>
					</div>
					<ul class="py-1">
						<li>
							<LanguageToggle />
						</li>
						<li class="border-t border-gray-600 mx-2 my-1"></li>
						{#if isLoggedIn}
							<li>
								<button
									type="button"
									class="w-full text-left flex items-center gap-2 px-4 py-2 hover:bg-gray-600 transition-colors"
									onclick={handleLogout}
								>
									<span
										class="material-symbols-outlined leading-none"
										style="font-size: 20px; font-variation-settings: 'FILL' 0, 'wght' 500, 'GRAD' 0, 'opsz' 20;"
									>
										logout
									</span>
									{logoutLabel}
								</button>
							</li>
						{/if}
					</ul>
				</div>
			{/if}
		</div>

		<div class="flex justify-around items-center pt-2 pb-4 px-4 h-16 overflow-hidden">
			{#if !$isNavbarCollapsed}
				<div class={$isNavbarCollapsed ? 'mx-auto' : ''} in:fade={{ delay: 300, duration: 150 }}>
					<img src="/logo_ecn.png" alt="ECN Automation" class="h-6 w-auto block" />
				</div>
			{/if}
			{#if !$isNavbarCollapsed}
				<div in:fade={{ delay: 300, duration: 150 }}>
					<img src="/logo_elecmetal.png" alt="Elecmetal" class="h-4 w-auto block" />
				</div>
			{/if}
		</div>
</nav>

