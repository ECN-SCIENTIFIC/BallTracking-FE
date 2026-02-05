<script context="module" lang="ts">
  export type Faja = {
    name: string;
    scatter?: { x: number; y: number }[];
    f80?: number;
    density?: string;
    densityColor?: string;
    cumulative?: { x: string; first: number; second: number }[];
    results: { label: string; value: string }[];
  };
</script>

<script lang="ts">
  import { goto } from '$app/navigation';
  import { processedImageStore, languageStore, translations, authStore, type Language } from './stores';
  
  // Use Faja type directly, no import needed
  export let fajas: Faja[] = [];
  export let activeSidebarTab: number = 0;
  export let setActiveSidebarTab: (i: number) => void = () => {};
  // If setActiveSidebarTab is not provided, manage internally
  let internalTab = 0;
  $: tab = setActiveSidebarTab === (() => {}) ? internalTab : activeSidebarTab;
  function handleTabClick(i: number) {
    if (setActiveSidebarTab === (() => {})) {
      internalTab = i;
    } else {
      setActiveSidebarTab(i);
    }
  }
  // Get current translations
  $: t = translations[$languageStore];
  $: sidebarTabs = [t.resultados, t.variables, t.config];

  // Convert store data to results format
  $: adjustedResults = $processedImageStore.data ? 
    Object.entries($processedImageStore.data.results.fs_ajust_dict).map(([label, value]) => ({
      label,
      value: value.toFixed(3)
    })) : [];

  function handleSignOut() {
    authStore.logout();
    goto('/login');
  }
</script>

<div class="bg-slate-800/80 backdrop-blur-xl border-l border-white/10 flex flex-col h-full w-[320px]">
  <!-- Sidebar Header -->
  <div class="p-4 border-b border-white/10">
    <div class="flex items-center justify-between">
      <span class="text-lg font-semibold text-white">{t.resultados}</span>
      {#if $processedImageStore.lastUpdated}
        <span class="text-xs text-gray-400">
          {t.updated}: {$processedImageStore.lastUpdated.toLocaleTimeString()}
        </span>
      {/if}
    </div>
  </div>

  <!-- Tabs -->
  <div class="flex border-b border-white/10">
    {#each sidebarTabs as tabName, i}
      <button
        class="flex-1 px-4 py-3 text-sm font-medium focus:outline-none transition-all duration-200 {tab === i ? 'border-b-2 border-cyan-400 text-white bg-white/5' : 'text-gray-400 hover:text-white hover:bg-white/5'}"
        on:click={() => handleTabClick(i)}
      >
        {tabName}
      </button>
    {/each}
  </div>

  <!-- Content -->
  <div class="overflow-y-auto flex-1 p-4">
    {#if tab === 0}
      <!-- Results Tab -->
      <div class="space-y-6">
        {#if $processedImageStore.loading}
          <div class="flex items-center justify-center py-8">
            <svg class="animate-spin h-6 w-6 text-cyan-400" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
            </svg>
          </div>
        {:else if $processedImageStore.error}
          <div class="bg-red-900/50 text-red-200 p-4 rounded-lg">
            {$processedImageStore.error}
          </div>
        {:else if $processedImageStore.data}
          <div class="bg-slate-700/30 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div class="font-semibold text-base mb-3 text-cyan-400">{t.currentResults}</div>
            <div class="space-y-2">
              {#each adjustedResults as result}
                <div class="flex justify-between items-center py-1 border-b border-white/5 last:border-b-0">
                  <span class="text-sm text-gray-300">{result.label}</span>
                  <span class="text-sm font-mono text-white">{result.value}</span>
                </div>
              {/each}
            </div>
          </div>
        {:else}
          <div class="text-center text-gray-400 py-8">
            {t.noDataAvailable}
          </div>
        {/if}
      </div>
    {:else if tab === 1}
      <!-- Statistics Tab -->
      <div class="space-y-6">
        {#if $processedImageStore.data}
          <div class="bg-slate-700/30 backdrop-blur-sm border border-white/10 rounded-lg p-4">
            <div class="font-semibold text-base mb-3 text-cyan-400">{t.currentStatistics}</div>
            <div class="space-y-4">
              <!-- Mean and Standard Deviation -->
              <div class="grid grid-cols-2 gap-4">
                <div class="bg-slate-800/50 rounded-lg p-3">
                  <div class="text-xs text-gray-400 mb-1">{t.mean}</div>
                  <div class="text-lg font-mono text-white">
                    {Object.values($processedImageStore.data.results.fs_ajust_dict).reduce((a, b) => a + b, 0) / Object.keys($processedImageStore.data.results.fs_ajust_dict).length}
                  </div>
                </div>
                <div class="bg-slate-800/50 rounded-lg p-3">
                  <div class="text-xs text-gray-400 mb-1">F80</div>
                  <div class="text-lg font-mono text-white">
                    {$processedImageStore.data.results.fs_ajust_dict['F80 mm']?.toFixed(3) || 'N/A'}
                  </div>
                </div>
              </div>
              <!-- Distribution -->
              <div>
                <div class="text-xs text-gray-400 mb-2">{t.distribution}</div>
                <div class="h-24 bg-slate-800/50 rounded-lg p-3">
                  <div class="h-full flex items-end justify-between">
                    {#each Object.entries($processedImageStore.data.results.fs_ajust_dict) as [key, value]}
                      <div class="w-1 bg-cyan-400/50" style="height: {(value / 100) * 100}%"></div>
                    {/each}
                  </div>
                </div>
              </div>
            </div>
          </div>
        {:else}
          <div class="text-center text-gray-400 py-8">
            {t.noDataAvailable}
          </div>
        {/if}
      </div>
    {:else if tab === 2}
      <!-- Settings Tab -->
      <div class="space-y-6">
        <!-- Language Selector -->
        <div class="bg-slate-700/30 backdrop-blur-sm border border-white/10 rounded-lg p-4">
          <label for="language" class="text-sm text-gray-300 mb-2 block">{t.language}</label>
          <select 
            id="language" 
            class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white"
            bind:value={$languageStore}
          >
            <option value="en">{t.english}</option>
            <option value="es">{t.spanish}</option>
          </select>
        </div>
        
        <div class="bg-slate-700/30 backdrop-blur-sm border border-white/10 rounded-lg p-4">
          <h3 class="font-semibold text-base mb-4 text-cyan-400">{t.cameraSettings}</h3>
          <div class="space-y-4">
            <!-- Resolution -->
            <div>
              <label for="resolution" class="text-sm text-gray-300 mb-2 block">{t.resolution}</label>
              <select id="resolution" class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white">
                <option>1920x1080</option>
                <option>1280x720</option>
                <option>640x480</option>
              </select>
            </div>
            <!-- Frame Rate -->
            <div>
              <label for="frameRate" class="text-sm text-gray-300 mb-2 block">{t.frameRate}</label>
              <select id="frameRate" class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white">
                <option>30 fps</option>
                <option>60 fps</option>
                <option>120 fps</option>
              </select>
            </div>
            <!-- Exposure -->
            <div>
              <label for="exposure" class="text-sm text-gray-300 mb-2 block">{t.exposure}</label>
              <input id="exposure" type="range" min="0" max="100" class="w-full" />
            </div>
          </div>
        </div>
        <div class="bg-slate-700/30 backdrop-blur-sm border border-white/10 rounded-lg p-4">
          <h3 class="font-semibold text-base mb-4 text-cyan-400">{t.analysisSettings}</h3>
          <div class="space-y-4">
            <!-- Sensitivity -->
            <div>
              <label for="sensitivity" class="text-sm text-gray-300 mb-2 block">{t.detectionSensitivity}</label>
              <input id="sensitivity" type="range" min="0" max="100" class="w-full" />
            </div>
            <!-- Threshold -->
            <div>
              <label for="threshold" class="text-sm text-gray-300 mb-2 block">{t.sizeThreshold}</label>
              <input id="threshold" type="number" class="w-full bg-slate-800/50 border border-white/10 rounded-lg px-3 py-2 text-white" placeholder={t.enterSizeInMm} />
            </div>
          </div>
        </div>
      </div>
    {/if}
  </div>

  <!-- Sign Out Button - Sticky Bottom -->
  <div class="p-4 border-t border-white/10 bg-slate-800/80 backdrop-blur-xl">
    <button
      on:click={handleSignOut}
      class="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg transition-colors duration-200 font-medium text-sm"
    >
      <svg
        class="w-5 h-5"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
        />
      </svg>
      Sign Out
    </button>
  </div>
</div> 