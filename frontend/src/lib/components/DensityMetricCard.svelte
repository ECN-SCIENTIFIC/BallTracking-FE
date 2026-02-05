<script lang="ts">
    import { languageStore, translations } from '../stores';
    
    export let processedImageStore: any;
    export let isCompact: boolean = false;
  
    $: t = translations[$languageStore];
  
    function getDensityInfo(f80Value: number) {
      let densityLevel: string;
      let densityColor: string;
  
      if (f80Value < 3) {
        densityLevel = t.muyFino;
        densityColor = "bg-blue-500";
      } else if (f80Value < 6.5) {
        densityLevel = t.fino;
        densityColor = "bg-green-500";
      } else if (f80Value < 9) {
        densityLevel = t.normal;
        densityColor = "bg-yellow-500";
      } else if (f80Value < 13) {
        densityLevel = t.grueso;
        densityColor = "bg-orange-500";
      } else {
        densityLevel = t.muyGrueso;
        densityColor = "bg-red-500";
      }
  
      return { densityLevel, densityColor };
    }
  </script>
  
  <div
    class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-{isCompact
      ? 'lg'
      : 'xl'} p-{isCompact ? '3' : '4'} flex-shrink-0"
  >
    <div class="flex items-center space-x-3 mb-3 min-w-0">
      <div class="p-{isCompact ? '1' : '2'} mr-2 bg-red-500/20 rounded-lg flex-shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          class="w-{isCompact ? '4' : '6'} h-{isCompact ? '4' : '6'} text-red-400"
          height="24px"
          viewBox="0 -960 960 960"
          width="24px"
          fill="currentColor"
        >
          <path d="M80-80q0-111 29.5-189.5T185-400q46-52 103-80.5T400-520v-120q-137-17-228.5-84.5T80-880h800q0 88-91.5 155.5T560-640v120q55 11 112 39.5T775-400q46 52 75.5 130.5T880-80H640v-80h155q-18-152-113.5-220T480-448q-106 0-201.5 68T165-160h155v80H80Zm400-635q91 0 162-24.5T755-800H205q42 36 113 60.5T480-715Zm0 635q-33 0-56.5-23.5T400-160q0-17 6.5-31t17.5-25q24-24 81-50.5T640-320q-28 78-54 135t-50 81q-11 11-25 17.5T480-80Zm0-635Z"/>
        </svg>
      </div>
      <div class="text-sm text-gray-400 truncate">{t.categoria}</div>
    </div>
    {#if $processedImageStore.data}
      {@const f80Key = Object.keys(
        $processedImageStore.data.results.fs_ajust_dict,
      ).find((key) => key.includes("F80"))}
      {@const f80Value = f80Key
        ? $processedImageStore.data.results.fs_ajust_dict[f80Key]
        : null}
      {@const densityInfo = f80Value !== null ? getDensityInfo(f80Value) : null}
      {#if densityInfo}
        {#if isCompact}
          <!-- Compact Version -->
          <!-- Compact Density Label -->
          <div class="mb-2">
            <span
              class="text-xs font-bold text-white px-2 py-1 rounded border border-white/20 inline-flex items-center {densityInfo.densityColor}"
            >
              {densityInfo.densityLevel}
            </span>
          </div>
          <!-- Simplified Progress Bar for Mobile -->
          <div class="w-full">
            <div
              class="relative w-full bg-gray-700 rounded-full h-2 overflow-hidden"
            >
              <div
                class="h-full rounded-full transition-all duration-500 ease-out {densityInfo.densityColor}"
                style="width: {f80Value !== null
                  ? Math.min(100, (f80Value / 15) * 100)
                  : 0}%"
              ></div>
              <!-- Tick marks overlay -->
              <div
                class="absolute inset-0 flex items-center justify-between px-0.5 pointer-events-none"
              >
                {#each [0, 3, 6.5, 9, 13, 15] as tick, i}
                  <div class="w-0.5 h-4 bg-white/50 rounded-full"></div>
                {/each}
              </div>
            </div>
            <!-- Minimal scale labels for mobile -->
            <div class="flex justify-between text-xs text-gray-400 mt-1">
              <span>0mm</span>
              <span>15mm</span>
            </div>
          </div>
        {:else}
          <!-- Desktop Version -->
          <!-- Density Label -->
          <div class="mb-3">
            <span
              class="text-sm font-bold text-white px-3 py-1.5 rounded-lg border border-white/20 inline-flex items-center {densityInfo.densityColor}"
            >
              {densityInfo.densityLevel}
              <span class="w-1.5 h-1.5 bg-white rounded-full ml-2"></span>
            </span>
          </div>
          <!-- Progress Bar Container -->
          <div class="w-full">
            <!-- Main Progress Bar -->
            <div
              class="relative w-full bg-gray-700 rounded-full h-3 overflow-hidden"
            >
              <div
                class="h-full rounded-full transition-all duration-500 ease-out {densityInfo.densityColor}"
                style="width: {f80Value !== null
                  ? Math.min(100, (f80Value / 15) * 100)
                  : 0}%"
              ></div>
              <!-- Tick marks overlay -->
              <div
                class="absolute inset-0 flex items-center justify-between px-0.5 pointer-events-none"
              >
                {#each [0, 3, 6.5, 9, 13, 15] as tick, i}
                  <div class="w-0.5 h-4 bg-white/50 rounded-full"></div>
                {/each}
              </div>
            </div>
            <!-- Scale Labels -->
            <div
              class="flex justify-between text-xs text-gray-400 mt-2 px-0.5"
            >
              <span class="text-center">0mm</span>
              <span class="text-center">15mm</span>
            </div>
          </div>
        {/if}
      {:else}
        <div class="text-{isCompact ? 'xs' : 'sm'} text-gray-400">
          {isCompact ? t.na : t.noDataAvailable}
        </div>
      {/if}
    {:else}
      <div class="text-{isCompact ? 'xs' : 'sm'} text-gray-400">
        {isCompact ? t.na : t.noDataAvailable}
      </div>
    {/if}
  </div>