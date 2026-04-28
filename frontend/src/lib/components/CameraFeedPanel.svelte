<script lang="ts">
  import type { Writable } from "svelte/store";
  import type { ProcessImageResponse } from "$lib/types";

  type ProcessedStore = Writable<{
    data: ProcessImageResponse | null;
    loading: boolean;
    error: string | null;
    lastUpdated: Date | null;
  }>;

  export let title: string;
  export let processedImageStore: ProcessedStore;
  export let processedImageMime: string;
  export let formattedTimestamp: string;
  export let waitingLabel: string;
  export let loadingLabel: string;
  export let retryLabel: string;
  export let updatingLabel: string;
  export let updatedPrefix: string;
  export let errorPrefix: string;
  export let loadingLabelShort: string;
  export let noImageLabel: string;
  export let showMeasurementOverlay = true;
  export let onRetry: () => void = () => {};
  export let minHeightStyle = "min-height: 360px;";
</script>

<div
  class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex-1 flex flex-col min-h-0 min-w-0 max-w-full"
  style={minHeightStyle}
>
  <div class="text-sm text-gray-300 mb-3 font-medium flex-shrink-0">
    {title}
  </div>
  <div
    class="relative flex-1 bg-slate-900/50 rounded-lg overflow-hidden min-h-0 min-w-0 max-w-full flex items-center justify-center"
  >
    <div class="relative w-full max-w-full min-w-0 h-full aspect-video bg-slate-800/50">
      {#if $processedImageStore.loading && !$processedImageStore.data}
        <div class="absolute inset-0 flex items-center justify-center bg-slate-800/50">
          <div class="flex flex-col items-center space-y-3">
            <svg class="animate-spin h-8 w-8 text-cyan-400" viewBox="0 0 24 24">
              <circle
                class="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                stroke-width="4"
                fill="none"
              />
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            <span class="text-sm text-cyan-300">{loadingLabel}</span>
          </div>
        </div>
      {:else if $processedImageStore.error}
        <div class="absolute inset-0 flex items-center justify-center bg-slate-800/50">
          <div class="flex flex-col items-center space-y-3 text-center p-4">
            <svg
              class="w-8 h-8 text-red-400"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              viewBox="0 0 24 24"
            >
              <path
                stroke-linecap="round"
                stroke-linejoin="round"
                d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span class="text-sm text-red-300">{$processedImageStore.error}</span>
            <button
              type="button"
              class="text-xs bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded transition-colors"
              on:click={onRetry}
            >
              {retryLabel}
            </button>
          </div>
        </div>
      {:else if $processedImageStore.data && $processedImageStore.data.results?.img_result}
        <img
          src={`data:${processedImageMime};base64,${$processedImageStore.data.results.img_result}`}
          alt="Processed Camera Feed"
          class="w-full h-full object-cover"
        />

        {#if $processedImageStore.loading}
          <div class="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg p-2">
            <div class="flex items-center space-x-2">
              <svg class="animate-spin h-4 w-4 text-cyan-400" viewBox="0 0 24 24">
                <circle
                  class="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  stroke-width="4"
                  fill="none"
                />
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
              </svg>
              <span class="text-xs text-cyan-300">{updatingLabel}</span>
            </div>
          </div>
        {/if}
      {:else}
        <div class="absolute inset-0 bg-slate-800/50 animate-pulse">
          <div class="flex flex-col items-center justify-center h-full gap-1 px-4 text-center">
            <span class="text-sm text-gray-400">{noImageLabel}</span>
            <span class="text-xs text-gray-500">{waitingLabel}</span>
          </div>
        </div>
      {/if}

      {#if showMeasurementOverlay}
        <div class="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none">
          {#each Array(16) as _, i}
            <div class="border border-orange-400/30"></div>
          {/each}
        </div>

        <div class="absolute inset-0 pointer-events-none">
          <div
            class="absolute left-2 top-8 bottom-2 flex flex-col justify-between text-xs text-orange-300 font-mono"
          >
            <span>100mm</span>
            <span>75mm</span>
            <span>50mm</span>
            <span>25mm</span>
            <span>0mm</span>
          </div>

          <div
            class="absolute top-2 left-8 right-2 flex justify-between text-xs text-orange-300 font-mono"
          >
            <span>0mm</span>
            <span>100mm</span>
            <span>200mm</span>
            <span>300mm</span>
            <span>400mm</span>
          </div>
        </div>
      {/if}
    </div>
  </div>
  <div class="flex justify-end items-center mt-3 flex-shrink-0 gap-2 flex-wrap">
    <div class="flex flex-col space-y-1 items-end">
      {#if $processedImageStore.lastUpdated}
        <div
          class="text-xs {$processedImageStore.loading ? 'text-cyan-400' : 'text-green-400'} font-mono"
        >
          {$processedImageStore.loading
            ? updatingLabel
            : `${updatedPrefix}: ${formattedTimestamp}`}
        </div>
      {:else if $processedImageStore.error}
        <div class="text-xs text-red-400 font-mono">
          {errorPrefix}: {$processedImageStore.error}
        </div>
      {:else}
        <div class="text-xs text-yellow-400 font-mono">
          {loadingLabelShort}
        </div>
      {/if}
    </div>
  </div>
</div>
