<script lang="ts">
  import { onMount } from 'svelte';
  import { processImage } from '$lib/api';
  import { normalizeProcessImageResponse } from '$lib/ballTracking/normalize';
  import { processedImageStore, setProcessedImageLoading, setProcessedImageError, updateProcessedImage } from '$lib/stores';

  async function fetchData() {
    setProcessedImageLoading(true);
    try {
      const data = normalizeProcessImageResponse(await processImage());
      if (!data) {
        throw new Error('Invalid response');
      }
      updateProcessedImage(data);
    } catch (e: any) {
      setProcessedImageError(e.message || 'Unknown error');
      console.error('Error fetching data:', e);
    }
  }

  onMount(fetchData);
</script>

<div class="min-h-screen bg-[#181e2a] text-white flex flex-col items-center py-10 px-4">
  <div class="w-full max-w-2xl">
    <h1 class="text-3xl font-bold mb-2">Process Image Results</h1>
    <h2 class="text-lg text-gray-400 mb-8">Fetched from /get-latest-result</h2>

    {#if $processedImageStore.loading}
      <div class="flex justify-center items-center h-40">
        <svg class="animate-spin h-8 w-8 text-cyan-400" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/></svg>
        <span class="ml-4 text-cyan-300">Loading...</span>
      </div>
    {:else if $processedImageStore.error}
      <div class="bg-red-900 text-red-200 p-4 rounded mb-4">{$processedImageStore.error}</div>
    {:else if $processedImageStore.data}
      <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div class="bg-[#232a3b] rounded-xl p-6">
          <h3 class="text-xl font-semibold mb-4 text-cyan-300">F-values</h3>
          <ul class="space-y-2">
            {#each Object.entries($processedImageStore.data.results.fs_dict) as [key, value]}
              <li class="flex justify-between border-b border-white/10 pb-1">
                <span class="text-gray-300">{key}</span>
                <span class="font-mono text-cyan-200">{value}</span>
              </li>
            {/each}
          </ul>
        </div>
        <div class="bg-[#232a3b] rounded-xl p-6">
          <h3 class="text-xl font-semibold mb-4 text-yellow-300">Adjusted F-values</h3>
          <ul class="space-y-2">
            {#each Object.entries($processedImageStore.data.results.fs_ajust_dict) as [key, value]}
              <li class="flex justify-between border-b border-white/10 pb-1">
                <span class="text-gray-300">{key}</span>
                <span class="font-mono text-yellow-200">{value}</span>
              </li>
            {/each}
          </ul>
        </div>
      </div>
      <div class="mt-8 bg-[#232a3b] rounded-xl p-6">
        <h3 class="text-lg font-semibold mb-2 text-white">Raw JSON</h3>
        <pre class="bg-gray-900 rounded p-4 text-xs text-gray-200 overflow-x-auto">{JSON.stringify($processedImageStore.data, null, 2)}</pre>
      </div>
    {/if}
  </div>
</div> 