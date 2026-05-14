<script lang="ts">
  import { onMount } from 'svelte';
  import { getLatestResult } from '$lib/api';
  import { normalizeProcessImageResponse } from '$lib/ballTracking/normalize';
  let loading = true;
  let error: string | null = null;
  let imageData: string | null = null;

  async function fetchImage() {
    loading = true;
    error = null;
    try {
      const data = normalizeProcessImageResponse(await getLatestResult());
      if (!data) {
        throw new Error('Invalid response');
      }
      
      if (data.results?.img_result) {
        imageData = `data:${data.results.img_result_mime ?? "image/jpeg"};base64,${data.results.img_result}`;
      } else {
        throw new Error('No image data found in response');
      }
    } catch (e: any) {
      error = e.message || 'Unknown error';
    } finally {
      loading = false;
    }
  }

  onMount(fetchImage);
</script>

<div class="min-h-screen bg-[#181e2a] text-white flex flex-col items-center py-10 px-4">
  <div class="w-full max-w-4xl">
    <h1 class="text-3xl font-bold mb-2">Processed Image Result</h1>
    <h2 class="text-lg text-gray-400 mb-8">Displaying latest image from API</h2>

    {#if loading}
      <div class="flex justify-center items-center h-40">
        <svg class="animate-spin h-8 w-8 text-cyan-400" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"/>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
        </svg>
        <span class="ml-4 text-cyan-300">Loading image...</span>
      </div>
    {:else if error}
      <div class="bg-red-900 text-red-200 p-4 rounded mb-4">{error}</div>
      <button 
        class="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-lg"
        on:click={fetchImage}
      >
        Try Again
      </button>
    {:else if imageData}
      <div class="bg-[#232a3b] rounded-xl p-6">
        <div class="relative aspect-video bg-slate-900/50 rounded-lg overflow-hidden">
          <img 
            src={imageData} 
            alt=""
            class="w-full h-full object-contain"
          />
        </div>
      </div>
    {/if}
  </div>
</div> 