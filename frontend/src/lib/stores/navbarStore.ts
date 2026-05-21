import { writable } from 'svelte/store';

const STORAGE_KEY = 'ball-tracking-navbar-collapsed';
const MOBILE_BREAKPOINT = 768;

function readStoredCollapsed(): boolean | null {
	if (typeof window === 'undefined') return null;
	try {
		const stored = localStorage.getItem(STORAGE_KEY);
		if (stored === null) return null;
		return stored === 'true';
	} catch {
		return null;
	}
}

function createNavbarStore() {
	const { subscribe, set, update } = writable(false);

	if (typeof window !== 'undefined') {
		subscribe((collapsed) => {
			try {
				localStorage.setItem(STORAGE_KEY, String(collapsed));
			} catch {
				/* ignore */
			}
		});
	}

	return {
		subscribe,
		set,
		update,
		initialize() {
			if (typeof window === 'undefined') return;
			const stored = readStoredCollapsed();
			if (stored !== null) {
				set(stored);
				return;
			}
			set(window.innerWidth < MOBILE_BREAKPOINT);
		},
		handleResize() {
			if (typeof window === 'undefined') return;
			if (window.innerWidth < MOBILE_BREAKPOINT) {
				set(true);
			}
		}
	};
}

export const isNavbarCollapsed = createNavbarStore();
