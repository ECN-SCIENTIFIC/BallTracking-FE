<script lang="ts">
    export let processedImageStore: any;
    export let isCompact: boolean = false;
  </script>
  
  <div
    class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-{isCompact
      ? 'lg'
      : 'xl'} p-{isCompact ? '3' : '4'} flex-shrink-0"
  >
    <div class="flex items-center space-x-3 mb-3 min-w-0">
      <div class="p-{isCompact ? '1' : '2'} mr-2 bg-green-500/20 rounded-lg flex-shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-{isCompact ? '4' : '6'} h-{isCompact ? '4' : '6'} text-green-400"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          viewBox="0 0 24 24"
        >
          <path
            stroke-linecap="round"
            stroke-linejoin="round"
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <div class="text-sm text-gray-400 truncate">Status</div>
    </div>
    <div
      class="text-{isCompact ? 'sm' : 'lg'} font-semibold {$processedImageStore.loading
        ? 'text-yellow-400'
        : $processedImageStore.error
          ? 'text-red-400'
          : $processedImageStore.data
            ? 'text-green-400'
            : 'text-gray-400'}"
    >
      {$processedImageStore.loading
        ? "Loading..."
        : $processedImageStore.error
          ? "Error"
          : $processedImageStore.data
            ? "Active"
            : "No Data"}
    </div>
    {#if !isCompact && $processedImageStore.lastUpdated}
      <div class="text-xs text-gray-400 mt-1">
        Last update: {$processedImageStore.lastUpdated.toLocaleTimeString()}
      </div>
    {/if}
  </div>