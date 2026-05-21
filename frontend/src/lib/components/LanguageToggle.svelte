<script lang="ts">
	import { languageStore, translations, type Language } from '$lib/stores';

	$: t = translations[$languageStore];

	function applyLanguage(language: Language) {
		if ($languageStore === language) return;
		languageStore.set(language);
	}
</script>

<div class="flex items-center gap-2 px-4 py-2 hover:bg-gray-600 transition-colors">
	<svg
		xmlns="http://www.w3.org/2000/svg"
		class="h-5 w-5 shrink-0"
		viewBox="0 0 20 20"
		fill="currentColor"
		aria-hidden="true"
	>
		<path
			fill-rule="evenodd"
			d="M7 2a1 1 0 011 1v1h3a1 1 0 110 2H9.578a18.87 18.87 0 01-1.724 4.78c.29.354.596.696.914 1.026a1 1 0 11-1.44 1.389 21.034 21.034 0 01-.554-.6 19.098 19.098 0 01-3.107 3.567 1 1 0 01-1.334-1.49 17.087 17.087 0 003.13-3.733 18.992 18.992 0 01-1.487-2.494 1 1 0 111.79-.89c.234.47.489.928.764 1.372.417-.934.752-1.913.997-2.927H3a1 1 0 110-2h3V3a1 1 0 011-1zm6 6a1 1 0 01.894.553l2.991 5.982a.869.869 0 01.02.037l.99 1.98a1 1 0 11-1.79.895L15.383 16h-4.764l-.724 1.447a1 1 0 11-1.788-.894l.99-1.98.019-.038 2.99-5.982A1 1 0 0113 8zm-1.382 6h2.764L13 11.236 11.618 14z"
			clip-rule="evenodd"
		/>
	</svg>
	<span class="min-w-0 flex-1">{t.language}</span>
	<div class="inline-flex rounded-md bg-black/10 p-0.5 ring-1 ring-inset ring-white/10">
		<button
			type="button"
			class="rounded px-2 py-0.5 text-xs font-semibold transition-colors duration-150 {$languageStore ===
			'en'
				? 'bg-white/20 text-white shadow-sm'
				: 'text-gray-300 hover:bg-white/10 hover:text-white'}"
			aria-pressed={$languageStore === 'en'}
			title={t.english}
			onclick={() => applyLanguage('en')}
		>
			EN
		</button>
		<button
			type="button"
			class="rounded px-2 py-0.5 text-xs font-semibold transition-colors duration-150 {$languageStore ===
			'es'
				? 'bg-white/20 text-white shadow-sm'
				: 'text-gray-300 hover:bg-white/10 hover:text-white'}"
			aria-pressed={$languageStore === 'es'}
			title={t.spanish}
			onclick={() => applyLanguage('es')}
		>
			ES
		</button>
	</div>
</div>
