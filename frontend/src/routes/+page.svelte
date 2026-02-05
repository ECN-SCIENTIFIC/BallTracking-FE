<script lang="ts">
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import Sidebar from "../lib/Sidebar.svelte";
  import {processedImageStore, setProcessedImageLoading, setProcessedImageError, updateProcessedImage, historicalF80Store, lastF80UpdateStore, languageStore, translations, type HistoricalF80Point} from "$lib/stores";
  import HistoricalF80Chart from "$lib/HistoricalF80Chart.svelte";
  import F80MetricCard from "$lib/components/F80MetricCard.svelte";
  import StatusMetricCard from "$lib/components/StatusMetricCard.svelte";
  import DensityMetricCard from "$lib/components/DensityMetricCard.svelte";
  import { loadConfig } from "$lib/runtimeConfig";
  
  // Get current translations
  $: t = translations[$languageStore];

  let sidebarCollapsed = true;
  let imageLoading = true;
  let imageError: string | null = null;
  let processedImageData: string | null = null;
  let lastUpdated: Date | null = null;
  let currentTime = new Date();
  let formattedTimestamp = "";
  let waitingForUpdate = false;
  let lastImageHash: string | null = null;
  let imageChangeCount = 0;
  let lastFetchAttempt: Date | null = null;
  let responseTimestamp: number | null = null;
  let windowWidth = 0;
  let isLoading = true;

  // Historical F80 data - now using persistent stores
  const F80_UPDATE_INTERVAL = 10000; // 10 seconds

  $: isDesktop = windowWidth >= 1024;
  $: isTablet = windowWidth >= 768 && windowWidth < 1024;
  $: isMobile = windowWidth < 768;

  function handleResize() {
    const newWidth = window.innerWidth;
    // Only update if width actually changed significantly (avoid minor updates)
    if (Math.abs(newWidth - windowWidth) > 10) {
      windowWidth = newWidth;
    }
  }

  async function fetchProcessedImage() {
    // Only show initial loading if we don't have any image yet
    if (!processedImageData) {
      imageLoading = true;
    } else {
      waitingForUpdate = true;
    }
    imageError = null;
    lastFetchAttempt = new Date();

    try {
      console.log("Fetching processed image...");
      const config = await loadConfig();
      const res = await fetch(
        `${config.apiBaseUrl}/process_image`,
      );
      
      if (res.status === 204) {
        console.log("No new image available");
        return;
      }
      
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      
      const data = await res.json();

      if (data.results?.img_result) {
        // Always update the stores with new data
        console.log("Updating stores with new data...");
        imageChangeCount++;
        processedImageData = `data:image/jpeg;base64,${data.results.img_result}`;
        lastUpdated = new Date();
        responseTimestamp = data.timestamp || null;
        updateProcessedImage(data);
      } else {
        throw new Error("No image data found in response");
      }
    } catch (e: any) {
      console.error("Error fetching image:", e);
      imageError = e.message || "Failed to load processed image";
      setProcessedImageError(imageError);
    } finally {
      imageLoading = false;
      waitingForUpdate = false;
      isLoading = false;
    }
  }

  onMount(() => {
    historicalF80Store.cleanOldData();
    handleResize();
    window.addEventListener("resize", handleResize);

    // Initial fetch
    fetchProcessedImage();
    
    // Set up intervals
    const imageInterval = setInterval(async () => {
      await fetchProcessedImage();
    }, 2000);
    
    const timeInterval = setInterval(() => {
      currentTime = new Date();
    }, 1000);

    return () => {
      clearInterval(imageInterval);
      clearInterval(timeInterval);
      window.removeEventListener("resize", handleResize);
    };
  });

  // Optimize store subscription
  $: if ($processedImageStore.data && !isLoading) {
    const currentTime = Date.now();
    if (currentTime - $lastF80UpdateStore >= F80_UPDATE_INTERVAL) {
      const f80 = getCurrentF80();
      if (f80 !== null) {
        const newPoint: HistoricalF80Point = { time: currentTime, value: f80 };
        historicalF80Store.addPoint(newPoint);
        lastF80UpdateStore.set(currentTime);
        console.log("Added new F80 point:", newPoint);
      }
    }
  }

  // Reactive statement to update formatted timestamp when time changes
  $: {
    if (lastUpdated && currentTime) {
      const diffMs = currentTime.getTime() - lastUpdated.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);

      if (diffSec < 60) {
        formattedTimestamp = `${diffSec}${t.seconds} ${t.ago}`;
      } else if (diffMin < 60) {
        formattedTimestamp = `${diffMin}${t.minutes} ${t.ago}`;
      } else {
        formattedTimestamp = lastUpdated.toLocaleTimeString("en-US", {
          hour12: false,
          hour: "2-digit",
          minute: "2-digit",
        });
      }
    } else {
      formattedTimestamp = "";
    }
  }

  function getCurrentF80() {
    if ($processedImageStore.data) {
      const f80Key = Object.keys(
        $processedImageStore.data.results.fs_ajust_dict,
      ).find((key) => key.includes("F80"));
      const f80Value = f80Key
        ? $processedImageStore.data.results.fs_ajust_dict[f80Key]
        : null;
      if (f80Value !== null) {
        return f80Value;
      }
    }
    return null;
  }

  // Mock data for the dashboard
  const fajas = [
    {
      name: "Faja 11",
      scatter: [
        { x: 250, y: 100 },
        { x: 500, y: 200 },
        { x: 750, y: 300 },
        { x: 1000, y: 400 },
        { x: 300, y: 250 },
        { x: 600, y: 350 },
        { x: 900, y: 150 },
        { x: 1100, y: 350 },
      ],
      f80: 15.5,
      density: "MUY GRUESO",
      densityColor: "bg-red-700",
      cumulative: [
        { x: "22/06", first: 10, second: 5 },
        { x: "24/05", first: 60, second: 30 },
        { x: "28/06", first: 90, second: 60 },
      ],
      results: [
        { label: "F100 mm", value: "22.331" },
        { label: "F90 mm", value: "22.331" },
        { label: "F80 mm", value: "22.331" },
        { label: "F70 mm", value: "22.331" },
        { label: "F60 mm", value: "22.331" },
        { label: "F50 mm", value: "22.331" },
        { label: "F40 mm", value: "22.331" },
        { label: "F30 mm", value: "22.331" },
        { label: "F20 mm", value: "22.331" },
        { label: "F10 mm", value: "22.331" },
        { label: "RockDete_index", value: "22.331" },
        { label: "rock_count", value: "931" },
        { label: "count_3mm", value: "22.331" },
        { label: "size_3mm", value: "22.331" },
      ],
    },
    {
      name: "Faja 04",
      scatter: [
        { x: 250, y: 100 },
        { x: 500, y: 200 },
        { x: 750, y: 300 },
        { x: 1000, y: 400 },
        { x: 300, y: 250 },
        { x: 600, y: 350 },
        { x: 900, y: 150 },
        { x: 1100, y: 350 },
      ],
      f80: 15.5,
      density: "MUY GRUESO",
      densityColor: "bg-red-700",
      cumulative: [
        { x: "22/06", first: 10, second: 5 },
        { x: "24/05", first: 60, second: 30 },
        { x: "28/06", first: 90, second: 60 },
      ],
      results: [
        { label: "F100 mm", value: "22.331" },
        { label: "F90 mm", value: "22.331" },
        { label: "F80 mm", value: "22.331" },
        { label: "F70 mm", value: "22.331" },
        { label: "F60 mm", value: "22.331" },
        { label: "F50 mm", value: "22.331" },
        { label: "F40 mm", value: "22.331" },
        { label: "F30 mm", value: "22.331" },
        { label: "F20 mm", value: "22.331" },
        { label: "F10 mm", value: "22.331" },
        { label: "RockDete_index", value: "22.331" },
        { label: "rock_count", value: "931" },
        { label: "count_3mm", value: "22.331" },
        { label: "size_3mm", value: "22.331" },
      ],
    },
  ];

  $: sidebarTabs = [t.resultados, t.variables, t.config];
  let activeSidebarTab = 0;

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

<div class="flex flex-col h-screen bg-gray-900 text-white overflow-hidden">
  <!-- Main Content -->
  <div class="flex-1 w-full">
    <div class="w-full p-6 space-y-6 overflow-y-auto h-screen">
      <header class="mb-6 flex items-center justify-between relative">
        <div>
          <div class="flex items-center gap-3 mt-2">
            <img
              src="/f80.png"
              alt="Logo"
              class="h-auto w-30 object-contain"
            />
            <!-- <h1 class="text-4xl font-bold text-white">F80 Meter</h1> -->
          </div>
          <h2 class="text-xl text-gray-300 mt-1">{t.generalOverview}</h2>
        </div>
        
        <!--  ECN SCI Logo -->
        <div class="absolute right-0 flex flex-col md:flex-row gap-2 md:gap-4 lg:gap-6 items-center mr-12 mt-8 md:mr-0 md:mt-0">
          <img
            src="/ecn-sci.png"
            alt="Logo"
            class="h-auto w-16 sm:w-20 md:w-24 lg:w-30 object-contain"
          />
          <img
            src="/suitemet.png"
            alt="Logo"
            class="h-16 w-16 sm:h-20 sm:w-20 md:h-24 md:w-24 lg:h-30 lg:w-30 object-contain mr-2 md:mr-12"
          />
        </div>
      </header>

      <div class="w-full">
        {#if isLoading}
          <div class="animate-pulse">
            {#if isDesktop}
              <div class="grid grid-cols-24 gap-4 h-full">
                <div class="col-span-9">
                  <div
                    class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 h-full"
                  >
                    <div class="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
                    <div class="bg-slate-900/50 rounded-lg h-[400px]"></div>
                  </div>
                </div>
                <div class="col-span-4">
                  <div class="flex flex-col gap-3">
                    <div class="bg-slate-800/50 rounded-xl p-4 h-32"></div>
                    <div class="bg-slate-800/50 rounded-xl p-4 h-32"></div>
                    <div class="bg-slate-800/50 rounded-xl p-4 h-32"></div>
                  </div>
                </div>
                <div class="col-span-11">
                  <div class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 h-full">
                    <div class="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
                    <div class="bg-slate-900/50 rounded-lg h-[400px]"></div>
                  </div>
                </div>
              </div>
            {:else}
              <div class="space-y-4">
                <div class="bg-slate-800/50 rounded-xl p-4 h-[250px]"></div>
                <div class="grid grid-cols-3 gap-3">
                  <div class="bg-slate-800/50 rounded-xl p-4 h-32"></div>
                  <div class="bg-slate-800/50 rounded-xl p-4 h-32"></div>
                  <div class="bg-slate-800/50 rounded-xl p-4 h-32"></div>
                </div>
                <div class="bg-slate-800/50 rounded-xl p-4 h-[200px]"></div>
              </div>
            {/if}
          </div>
        {:else}
          <div class="space-y-4">
            {#each fajas as faja, index}
              <div
                class=" cursor-pointer group transition-shadow duration-200 hover:shadow-2xl hover:ring-2 hover:ring-cyan-400/40 rounded-xl bg-transparent border-0 py-2 px-3 lg:py-4 lg:px-6 text-left w-full"
                role="button"
                tabindex="0"
                aria-label={`Ver detalles de ${faja.name}`}
                on:click={() => goto(`/faja/${encodeURIComponent(faja.name)}`)}
                on:keydown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    goto(`/faja/${encodeURIComponent(faja.name)}`);
                  }
                }}
              >
                <div class="flex items-center justify-between mb-6">
                  <h3 class="text-2xl font-bold text-white">{faja.name}</h3>
                </div>

                {#if isDesktop}
                  <div class="grid grid-cols-24 gap-4 h-full">
                    <!-- Desktop content -->
                    <div class="col-span-9">
                      <div class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 h-full flex flex-col">
                        <!-- Camera content -->
                        <div class="text-sm text-gray-300 mb-3 font-medium">
                          {t.granulometriaCamara}
                        </div>
                        <div class="relative flex-1 bg-slate-900/50 rounded-lg overflow-hidden">
                          <!-- Image content -->
                          {#if imageLoading && !processedImageData}
                            <div
                              class="absolute inset-0 flex items-center justify-center bg-slate-800/50"
                            >
                              <div class="flex flex-col items-center space-y-3">
                                <svg
                                  class="animate-spin h-8 w-8 text-cyan-400"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    class="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="4"
                                    fill="none"
                                  />
                                  <path
                                    class="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8z"
                                  />
                                </svg>
                                <span class="text-sm text-cyan-300"
                                  >{t.loadingProcessedImage}</span
                                >
                              </div>
                            </div>
                          {:else if imageError}
                            <div
                              class="absolute inset-0 flex items-center justify-center bg-slate-800/50"
                            >
                              <div
                                class="flex flex-col items-center space-y-3 text-center p-4"
                              >
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
                                <span class="text-sm text-red-300"
                                  >{imageError}</span
                                >
                                <button
                                  class="text-xs bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded transition-colors"
                                  on:click={fetchProcessedImage}
                                >
                                  {t.retry}
                                </button>
                              </div>
                            </div>
                          {:else if processedImageData}
                            <div class="absolute inset-0 flex items-center justify-center bg-black">
                              <img
                                src={processedImageData}
                                alt="Processed Camera Feed"
                                class="w-full h-full object-contain"
                              />
                            </div>
                            {#if waitingForUpdate}
                              <div
                                class="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg p-2"
                              >
                                <div class="flex items-center space-x-2">
                                  <svg
                                    class="animate-spin h-4 w-4 text-cyan-400"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      class="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      stroke-width="4"
                                      fill="none"
                                    />
                                    <path
                                      class="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8v8z"
                                    />
                                  </svg>
                                  <span class="text-xs text-cyan-300"
                                    >{t.updating}</span
                                  >
                                </div>
                              </div>
                            {/if}
                          {:else}
                            <div
                              class="absolute inset-0 bg-slate-800/50 animate-pulse"
                            >
                              <div
                                class="flex items-center justify-center h-full"
                              >
                                <span class="text-sm text-gray-400"
                                  >{t.noImageAvailable}</span
                                >
                              </div>
                            </div>
                          {/if}

                          <!-- Grid overlay -->
                          <div class="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none">
                            {#each Array(16) as _, i}
                              <div class="border border-orange-400/30"></div>
                            {/each}
                          </div>

                          <!-- Measurements -->
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
                        </div>

                        <!-- Status info -->
                        <div class="flex justify-between items-center mt-3">
                          <div class="text-xs text-gray-400 font-mono">
                            {t.cameraFaja} {faja.name.split(" ")[1]}
                          </div>
                          <div class="flex flex-col space-y-1">
                            {#if lastUpdated}
                              <div
                                class="text-xs {waitingForUpdate
                                  ? 'text-cyan-400'
                                  : 'text-green-400'} font-mono"
                              >
                                {waitingForUpdate
                                  ? t.updating
                                  : `${t.updated}: ${formattedTimestamp}`}
                              </div>
                            {:else if imageError}
                              <div class="text-xs text-red-400 font-mono">
                                {t.error}: {imageError}
                              </div>
                            {:else}
                              <div class="text-xs text-yellow-400 font-mono">
                                {t.loading}
                              </div>
                            {/if}
                            {#if responseTimestamp}
                              <div class="text-xs text-orange-400 font-mono">
                                {t.backend}: {new Date(
                                  responseTimestamp * 1000,
                                ).toLocaleTimeString()}
                              </div>
                            {/if}
                          </div>
                        </div>
                      </div>
                    </div>

                    <!-- Metrics -->
                    <div class="col-span-4">
                      <div class="flex flex-col gap-3 h-full">
                        <F80MetricCard
                          {processedImageStore}
                          isCompact={false}
                        />
                        <DensityMetricCard
                          {processedImageStore}
                          isCompact={false}
                        />
                        <!-- <StatusMetricCard
                          {processedImageStore}
                          isCompact={false}
                        />
                        <StatusMetricCard
                        {processedImageStore}
                        isCompact={false}
                      /> -->
                      </div>
                    </div>

                    <!-- Chart -->
                    <div class="col-span-11">
                      <div class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 h-full flex flex-col">
                        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
                          <div class="text-sm text-gray-300 font-medium">
                            {t.f80HistoricalChart}
                          </div>
                        </div>
                        <div class="flex-1">
                          <HistoricalF80Chart data={$historicalF80Store} />
                        </div>
                      </div>
                    </div>
                  </div>
                {:else}
                  <!-- Mobile layout -->
                  <div class="space-y-4">
                    <div class="w-full">
                      <div
                        class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-3 min-h-[250px]"
                      >
                        <div class="text-sm text-gray-300 mb-3 font-medium">
                          {t.granulometriaCamara}
                        </div>
                        <div
                          class="relative aspect-video bg-slate-900/50 rounded-lg overflow-hidden"
                        >
                          <!-- Mobile image content -->
                          {#if imageLoading && !processedImageData}
                            <div
                              class="absolute inset-0 flex items-center justify-center bg-slate-800/50"
                            >
                              <div class="flex flex-col items-center space-y-3">
                                <svg
                                  class="animate-spin h-8 w-8 text-cyan-400"
                                  viewBox="0 0 24 24"
                                >
                                  <circle
                                    class="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    stroke-width="4"
                                    fill="none"
                                  />
                                  <path
                                    class="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v8z"
                                  />
                                </svg>
                                <span class="text-sm text-cyan-300"
                                  >{t.loadingProcessedImage}</span
                                >
                              </div>
                            </div>
                          {:else if imageError}
                            <div
                              class="absolute inset-0 flex items-center justify-center bg-slate-800/50"
                            >
                              <div
                                class="flex flex-col items-center space-y-3 text-center p-4"
                              >
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
                                <span class="text-sm text-red-300"
                                  >{imageError}</span
                                >
                                <button
                                  class="text-xs bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded transition-colors"
                                  on:click={fetchProcessedImage}
                                >
                                  {t.retry}
                                </button>
                              </div>
                            </div>
                          {:else if processedImageData}
                            <div
                              class="absolute inset-0 flex items-center justify-center bg-black"
                            >
                              <img
                                src={processedImageData}
                                alt="Processed Camera Feed"
                                class="max-w-full max-h-full object-contain"
                              />
                            </div>
                            {#if waitingForUpdate}
                              <div
                                class="absolute top-2 right-2 bg-black/50 backdrop-blur-sm rounded-lg p-2"
                              >
                                <div class="flex items-center space-x-2">
                                  <svg
                                    class="animate-spin h-4 w-4 text-cyan-400"
                                    viewBox="0 0 24 24"
                                  >
                                    <circle
                                      class="opacity-25"
                                      cx="12"
                                      cy="12"
                                      r="10"
                                      stroke="currentColor"
                                      stroke-width="4"
                                      fill="none"
                                    />
                                    <path
                                      class="opacity-75"
                                      fill="currentColor"
                                      d="M4 12a8 8 0 018-8v8z"
                                    />
                                  </svg>
                                  <span class="text-xs text-cyan-300"
                                    >{t.updating}</span
                                  >
                                </div>
                              </div>
                            {/if}
                          {:else}
                            <div
                              class="absolute inset-0 bg-slate-800/50 animate-pulse"
                            >
                              <div
                                class="flex items-center justify-center h-full"
                              >
                                <span class="text-sm text-gray-400"
                                  >{t.noImageAvailable}</span
                                >
                              </div>
                            </div>
                          {/if}

                          <!-- Mobile grid overlay -->
                          <div
                            class="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none"
                          >
                            {#each Array(16) as _, i}
                              <div class="border border-orange-400/30"></div>
                            {/each}
                          </div>

                          <!-- Mobile measurements -->
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
                        </div>
                      </div>
                    </div>

                    <!-- Mobile metrics -->
                    <!-- <div class="grid grid-cols-3 gap-3"> -->
                     <div class="grid grid-cols-2  gap-3">
                      <F80MetricCard {processedImageStore} isCompact={true} />
                      <DensityMetricCard
                        {processedImageStore}
                        isCompact={true}
                      />
                      <!-- <StatusMetricCard
                        {processedImageStore}
                        isCompact={true}
                      /> -->
                    </div>

                    <!-- Mobile chart -->
                    <div class="mt-4">
                      <div
                        class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4"
                      >
                        <div
                          class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-2"
                        >
                          <div class="text-sm text-gray-300 font-medium">
                            {t.f80HistoricalChart}
                          </div>
                        </div>
                        <div class="h-[250px]">
                          <HistoricalF80Chart data={$historicalF80Store} />
                        </div>
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            {/each}
          </div>
        {/if}
      </div>
    </div>
  </div>

  <!-- Right Sidebar - Floating Layer -->
  <button
    class="fixed top-4 right-2 z-30 bg-slate-700/80 backdrop-blur-sm hover:bg-slate-600/80 text-white rounded-full p-2 focus:outline-none border border-white/10 mr-4"
    on:click={() => (sidebarCollapsed = !sidebarCollapsed)}
    aria-label="Toggle sidebar"
    style="pointer-events: auto;"
  >
    {#if sidebarCollapsed}
      <svg
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          d="M15 19l-7-7 7-7"
        />
      </svg>
    {:else}
      <svg
        class="w-6 h-6"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        viewBox="0 0 24 24"
      >
        <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    {/if}
  </button>
  <div
    class="fixed right-0 top-0 h-full z-20 transition-all duration-300 ease-in-out"
    style="width: {sidebarCollapsed
      ? '0px'
      : '320px'}; pointer-events: {sidebarCollapsed ? 'none' : 'auto'};"
  >
    {#if !sidebarCollapsed}
      <Sidebar
        {fajas}
        {activeSidebarTab}
        setActiveSidebarTab={(i) => (activeSidebarTab = i)}
      />
    {/if}
  </div>
</div>
