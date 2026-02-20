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
  import { page } from "$app/stores";
  import { goto } from "$app/navigation";
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import Sidebar from "$lib/Sidebar.svelte";
  import BallTrackingLineChart from "$lib/components/BallTrackingLineChart.svelte";
  import {
    processedImageStore,
    setProcessedImageLoading,
    setProcessedImageError,
    updateProcessedImage,
    ballTrackingBackendStore,
    millSelectionStore,
    type MillSelection,
    languageStore,
    translations,
  } from "$lib/stores";
  
  $: t = translations[$languageStore];
  import { loadConfig } from "$lib/runtimeConfig";

  // Mock data (should be replaced with real data source)
  const fajas: Faja[] = [
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

  let selectedFaja: Faja | null = null;
  $: {
    const { name } = get(page).params;
    selectedFaja = fajas.find((f) => f.name === name) || null;
  }

  let sidebarCollapsed = true;
  let activeSidebarTab = 0;
  let isDesktop = false;
  let activeTab = 1; // Ball Tracking tab

  // Add camera feed related variables
  let currentTime = new Date();
  let formattedTimestamp = "";
  let lastImageHash: string | null = null;
  let imageChangeCount = 0;
  let responseTimestamp: number | null = null;

  let isLoading = true;
  let ballsCurrentFrame = 0;
  let ballsTotalCount = 0;
  let lastDetectionTimestamp: number | null = null;
  let inchancable = false;
  let inchancableValue: boolean | null = null;
  let inchancableStatusLabel = "0";

  function handleResize() {
    const newIsDesktop = window.innerWidth >= 1024;
    // Only update if breakpoint actually changed
    if (newIsDesktop !== isDesktop) {
      isDesktop = newIsDesktop;
    }
  }

  // Reactive tab labels - ball tracking only
  $: tabs = ENABLE_BALL_TRACKING ? [{ id: 1, label: t.ballTracking }] : [];
  
  // FEATURE FLAGS: Enable/disable features for modular setup
  const ENABLE_BALL_TRACKING = true; // Set to false to disable Ball Tracking tab
  const INCHANCABLE_FLAG = false; // Toggle inchancable + mass visuals
  
  // Ball tracking derived metrics (accept extra backend fields without typing)
  let ballResults: any = {};
  $: ballResults = $processedImageStore.data?.results ?? $processedImageStore.data ?? {};
  $: processedImageMime = ballResults?.img_result_mime ?? "image/jpeg";
  $: ballsCurrentFrame = ballResults?.numero_bolas_img ?? 0;
  $: ballsTotalCount = ballResults?.conteo_bolas ?? 0;
  $: lastDetectionTimestamp = ballResults?.last_detection_timestamp ?? null;
  $: gateStatus = ballResults?.gate_status ?? "open";
  $: activeMill = ballResults?.active_mill ?? "M1";
  const backendInchancable = ballResults?.inchancable;
  $: inchancable = INCHANCABLE_FLAG;
  $: inchancableValue =
    backendInchancable !== undefined && backendInchancable !== null
      ? !!backendInchancable
      : null;
  $: inchancableStatusLabel =
    inchancableValue === null ? "0" : inchancableValue ? t.active : t.inactive;

  $: lastDetectionDisplay = lastDetectionTimestamp
    ? new Date(lastDetectionTimestamp).toLocaleTimeString()
    : "None";

  // New indicator: Mass in kg
  $: ballMass = ballResults?.masa_total ?? ballResults?.total_mass ?? ballResults?.mass ?? 0;
  $: ballMassDisplay = ballMass > 0 ? ballMass.toFixed(2) : "0.00";

  // Reactive title and subtitle
  // $: pageTitle = `${selectedFaja?.name} ${t.ballTracking}`;
  $: pageTitle = `${t.ballTracking}`;
  $: pageSubtitle = t.ballDetectionOverview;
  const millSelectorOptions: Array<{ value: MillSelection; label: string }> = [
    { value: "M1", label: "M1" },
    { value: "M2", label: "M2" },
    { value: "ALL", label: "Both" },
  ];

  async function fetchProcessedImage() {
    // Always set loading state through store when we don't have data
    if (!$processedImageStore.data) {
      setProcessedImageLoading(true);
    }
    setProcessedImageError(null);

    try {
      const config = await loadConfig();
      const res = await fetch(
        `${config.apiBaseUrl}/process_image`,
      );
      if (res.status === 204) {
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const trackingPayload = data?.results?.ball_tracking;

      if (
        trackingPayload &&
        Array.isArray(trackingPayload.pulses) &&
        Array.isArray(trackingPayload.cumulative)
      ) {
        ballTrackingBackendStore.set({
          bucketMs: trackingPayload.bucket_ms ?? 10000,
          gateStatus: data?.results?.gate_status ?? "open",
          activeMill: data?.results?.active_mill ?? "M1",
          pulses: trackingPayload.pulses,
          cumulative: trackingPayload.cumulative,
        });
      }

      if (data.results?.img_result) {
        const newImageHash = data.results.img_result.substring(0, 50);
        const imageActuallyChanged = newImageHash !== lastImageHash;

        if (imageActuallyChanged) {
          imageChangeCount++;
          lastImageHash = newImageHash;
        }
        responseTimestamp = data.timestamp || null;
        updateProcessedImage(data);
      } else {
        throw new Error("No image data found in response");
      }
    } catch (e: any) {
      const errorMessage = e.message || "Failed to load processed image";
      setProcessedImageError(errorMessage);
    } finally {
      setProcessedImageLoading(false);
      isLoading = false;
    }
  }

  onMount(() => {
    handleResize();
    window.addEventListener("resize", handleResize);

    fetchProcessedImage();
    const imageInterval = setInterval(fetchProcessedImage, 2000);
    const timeInterval = setInterval(() => {
      currentTime = new Date();
    }, 1000);

    return () => {
      clearInterval(imageInterval);
      clearInterval(timeInterval);
      window.removeEventListener("resize", handleResize);
    };
  });

  // Reactive statement to update formatted timestamp when time changes
  $: {
    if ($processedImageStore.lastUpdated && currentTime) {
      const diffMs =
        currentTime.getTime() - $processedImageStore.lastUpdated.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const diffMin = Math.floor(diffSec / 60);

      if (diffSec < 60) {
        formattedTimestamp = `${diffSec}${t.seconds} ${t.ago}`;
      } else if (diffMin < 60) {
        formattedTimestamp = `${diffMin}${t.minutes} ${t.ago}`;
      } else {
        formattedTimestamp =
          $processedImageStore.lastUpdated.toLocaleTimeString("en-US", {
            hour12: false,
            hour: "2-digit",
            minute: "2-digit",
          });
      }
    } else {
      formattedTimestamp = "";
    }
  }
</script>

<style>
  :global(html), :global(body) {
    background-color: #111827; /* gray-900 */
    margin: 0;
    padding: 0;
    min-height: 100vh;
  }
  
  :global(*) {
    box-sizing: border-box;
  }
</style>

{#if !selectedFaja}
  <div class="flex flex-col items-center justify-center h-screen text-center bg-gray-900">
    <div class="text-2xl text-red-400 font-bold mb-4">{t.fajaNotFound}</div>
    <button
      class="bg-cyan-500 hover:bg-cyan-600 text-white font-semibold px-6 py-3 rounded-lg transition-colors shadow-lg"
      on:click={() => goto("/")}>{t.backToOverview}</button
    >
  </div>
{:else}
  <div class="flex h-screen bg-gray-900 text-white overflow-hidden">
    <div class="flex-1 flex flex-col min-h-0">
      <div class="w-full p-6 flex flex-col h-full min-h-0 overflow-auto">
        <header class="mb-4 flex items-center gap-4 flex-shrink-0">
          <button
            class="bg-slate-700/80 hover:bg-slate-600/80 text-white rounded-lg p-2 transition-colors shadow-lg border border-white/10"
            on:click={() => goto("/")}
            aria-label={t.backToOverview}
          >
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
          </button>
          <div class="flex-1 min-w-0">
            <h1 class="text-4xl font-bold text-white">
              {pageTitle}
            </h1>
            <h2 class="text-xl text-gray-300 mt-1">
              {pageSubtitle}
            </h2>
            <div class="text-xs text-gray-500 mt-1">
              Gate: <span class={gateStatus === "open" ? "text-emerald-400" : "text-orange-400"}>{gateStatus}</span>
              {" · "}
              Active mill: <span class="text-cyan-400">{activeMill}</span>
            </div>
          </div>
          <div class="ml-auto flex items-center gap-2 self-start">
            {#each millSelectorOptions as option}
              <button
                class={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                  $millSelectionStore === option.value
                    ? "bg-cyan-500/25 border-cyan-400/70 text-cyan-200"
                    : "bg-slate-700/60 border-white/10 text-gray-200 hover:bg-slate-600/70"
                }`}
                on:click={() => millSelectionStore.set(option.value)}
              >
                {option.label}
              </button>
            {/each}
          </div>
        </header>

        <!-- Tab Navigation -->
        {#if false}
          <div class="flex border-b border-slate-700 mb-3 flex-shrink-0">
            {#each tabs as tab}
              <button
                class="px-6 py-3 text-sm font-medium transition-colors {activeTab === tab.id
                  ? 'text-cyan-400 border-b-2 border-cyan-400'
                  : 'text-gray-400 hover:text-gray-300'}"
                on:click={() => (activeTab = tab.id)}
              >
                {tab.label}
              </button>
            {/each}
          </div>
        {/if}

        <!-- Ball Detection Indicators - Moved to top level -->
        {#if activeTab === 1 && ENABLE_BALL_TRACKING}
          <div class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex-shrink-0 flex flex-col mb-4">
            <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-3 gap-2">
              <div class="text-sm text-gray-300 font-medium">
                {t.ballDetectionIndicators}
              </div>
              <div class="text-xs text-gray-500">
                {formattedTimestamp || t.waitingForUpdates}
              </div>
            </div>
            <div class={`grid gap-3 ${inchancable ? 'grid-cols-2 md:grid-cols-5' : 'grid-cols-2 md:grid-cols-3'}`}>
              <div class="bg-slate-700/30 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <div class="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
                  <svg class="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M8 12l2 2 4-4" />
                  </svg>
                </div>
                <div class="text-xs text-gray-400 mb-1">{t.currentFrame}</div>
                <div class="text-xl font-bold text-blue-400">
                  {ballsCurrentFrame}
                </div>
              </div>

              <div class="bg-slate-700/30 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <div class="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                  <svg class="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                </div>
                <div class="text-xs text-gray-400 mb-1">{t.totalCount}</div>
                <div class="text-xl font-bold text-green-400">
                  {ballsTotalCount}
                </div>
              </div>

              <div class="bg-slate-700/30 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                <div class="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center mb-2">
                  <svg class="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div class="text-xs text-gray-400 mb-1">{t.lastDetection}</div>
                <div class="text-sm font-medium text-purple-400">
                  {lastDetectionDisplay}
                </div>
              </div>

              {#if inchancable}
                <!-- Mass indicator -->
                <div class="bg-slate-700/30 rounded-lg p-3 flex flex-col items-center justify-center text-center">
                  <div class="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center mb-2">
                    <svg class="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                  </div>
                  <div class="text-xs text-gray-400 mb-1">{t.mass}</div>
                  <div class="text-xl font-bold text-cyan-400">
                    {ballMassDisplay} kg
                  </div>
                </div>

                <div class={`rounded-lg p-3 flex flex-col items-center justify-center text-center transition-colors col-span-2 md:col-span-1 ${inchancableValue ? 'border border-orange-500/40 bg-orange-500/15' : 'bg-slate-700/30'}`}>
                  <div class={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${inchancableValue ? 'bg-orange-500/25' : 'bg-gray-500/20'}`}>
                    <svg class={`w-4 h-4 ${inchancableValue ? 'text-orange-400' : 'text-gray-400'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div class={`text-xs mb-1 ${inchancableValue ? 'text-orange-300' : 'text-gray-400'}`}>{t.inchancable}</div>
                  <div class={`text-sm font-medium ${inchancableValue ? 'text-orange-400' : 'text-gray-400'}`}>
                    {inchancableStatusLabel}
                  </div>
                </div>
              {/if}
            </div>
          </div>
        {/if}

        {#if activeTab === 1 && ENABLE_BALL_TRACKING}
          {#if isLoading}
            <div class="animate-pulse">
              {#if isDesktop}
                <div
                  class={`grid grid-cols-12 gap-4 flex-1 min-h-0 items-stretch ${
                    activeTab === 1 ? 'min-h-[480px]' : ''
                  }`}
                >
                  <!-- Left Column Skeleton -->
                  <div class="col-span-6 flex flex-col min-h-0 h-full self-stretch">
                    <!-- Camera Feed Skeleton -->
                    <div class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex-1 min-h-[360px]">
                      <div class="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
                      <div class="bg-slate-900/50 rounded-lg h-[400px]"></div>
                    </div>
                  </div>
                  <!-- Right Column Skeleton -->
                  <div class="col-span-6 flex flex-col gap-4 min-h-0 h-full self-stretch">
                    <div class="bg-slate-800/50 rounded-xl p-4 flex-1 min-h-[360px]"></div>
                    <div class="bg-slate-800/50 rounded-xl p-4 flex-1 min-h-[360px]"></div>
                  </div>
                </div>
              {:else}
                <!-- Mobile Skeleton -->
                <div class="flex flex-col gap-4">
                  <div class="bg-slate-800/50 rounded-xl p-4 h-[250px]"></div>
                  <div class="bg-slate-800/50 rounded-xl p-4 h-[200px]"></div>
                  <div class="bg-slate-800/50 rounded-xl p-4 h-[200px]"></div>
                </div>
              {/if}
            </div>
          {:else}
            {#if isDesktop}
              <!-- Desktop Layout -->
              <div
                class={`grid grid-cols-12 gap-4 flex-1 min-h-0 items-stretch ${
                  activeTab === 1 ? 'min-h-[480px]' : ''
                }`}
              >
                <!-- Left Column - Cards + Camera Feed -->
                <div class="col-span-6 flex flex-col gap-4 min-h-0 h-full self-stretch">
                  <!-- Camera Feed - Let it grow naturally with min-height for readability -->
                  <div
                    class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex-1 flex flex-col min-h-0"
                    style="min-height: 360px;"
                  >
                    <div
                      class="text-sm text-gray-300 mb-3 font-medium flex-shrink-0"
                    >
                      {t.granulometriaCamara}
                    </div>
                    <div
                      class="relative flex-1 bg-slate-900/50 rounded-lg overflow-hidden min-h-0 flex items-center justify-center"
                    >
                      <!-- Camera Feed Container -->
                      <div
                        class="relative w-full h-full aspect-video bg-slate-800/50"
                      >
                        {#if $processedImageStore.loading && !$processedImageStore.data}
                          <!-- Initial Loading State -->
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
                        {:else if $processedImageStore.error}
                          <!-- Error State -->
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
                                >{$processedImageStore.error}</span
                              >
                              <button
                                class="text-xs bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded transition-colors"
                                on:click={fetchProcessedImage}
                              >
                                {t.retry}
                              </button>
                            </div>
                          </div>
                        {:else if $processedImageStore.data && $processedImageStore.data.results?.img_result}
                          <!-- Processed Image -->
                          <img
                            src={`data:${processedImageMime};base64,${$processedImageStore.data.results.img_result}`}
                            alt="Processed Camera Feed"
                            class="w-full h-full object-cover"
                          />

                          <!-- Waiting for Update Overlay -->
                          {#if $processedImageStore.loading}
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
                          <!-- Fallback Skeleton -->
                          <div
                            class="absolute inset-0 bg-slate-800/50 animate-pulse"
                          >
                            <div class="flex items-center justify-center h-full">
                              <span class="text-sm text-gray-400"
                                >{t.noImageAvailable}</span
                              >
                            </div>
                          </div>
                        {/if}

                        <!-- Measurement Grid Overlay -->
                        <div
                          class="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none"
                        >
                          {#each Array(16) as _, i}
                            <div class="border border-orange-400/30"></div>
                          {/each}
                        </div>

                        <!-- Measurement Indicators -->
                        <div class="absolute inset-0 pointer-events-none">
                          <!-- Vertical Measurements -->
                          <div
                            class="absolute left-2 top-8 bottom-2 flex flex-col justify-between text-xs text-orange-300 font-mono"
                          >
                            <span>100mm</span>
                            <span>75mm</span>
                            <span>50mm</span>
                            <span>25mm</span>
                            <span>0mm</span>
                          </div>

                          <!-- Horizontal Measurements -->
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
                    <div
                      class="flex justify-between items-center mt-3 flex-shrink-0"
                    >
                      <div class="text-xs text-gray-400 font-mono">
                        CAMERA {selectedFaja.name}
                      </div>
                      <div class="flex flex-col space-y-1">
                        {#if $processedImageStore.lastUpdated}
                          <div
                            class="text-xs {$processedImageStore.loading
                              ? 'text-cyan-400'
                              : 'text-green-400'} font-mono"
                          >
                            {$processedImageStore.loading
                              ? t.updating
                              : `${t.updated}: ${formattedTimestamp}`}
                          </div>
                        {:else if $processedImageStore.error}
                          <div class="text-xs text-red-400 font-mono">
                            {t.error}: {$processedImageStore.error}
                          </div>
                        {:else}
                          <div class="text-xs text-yellow-400 font-mono">
                            {t.loading}
                          </div>
                        {/if}

                        <!-- Debug Info -->
                        <div class="flex items-center space-x-2">
                          {#if imageChangeCount > 0}
                            <div class="text-xs text-purple-400 font-mono">
                              Images: {imageChangeCount} changes
                            </div>
                          {/if}
                          <button
                            class="text-xs bg-purple-500 hover:bg-purple-600 text-white px-2 py-1 rounded transition-colors"
                            on:click={fetchProcessedImage}
                            disabled={$processedImageStore.loading}
                          >
                            🔄
                          </button>
                        </div>
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

                <!-- Right Column - Will automatically match left column height -->
                <div class="col-span-6 flex flex-col gap-4 min-h-0 h-full self-stretch">
                  <BallTrackingLineChart />
                </div>
              </div>
            {:else}
              <!-- Mobile Layout -->
              <div class="flex flex-col gap-4 flex-1 min-h-0">
                <!-- Camera Feed -->
                <div
                  class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex-shrink-0 flex flex-col min-h-[400px]"
                >
                  <div class="text-sm text-gray-300 mb-3 font-medium flex-shrink-0">
                    Granulometría Cámara
                  </div>
                  <div
                    class="relative flex-1 bg-slate-900/50 rounded-lg overflow-hidden min-h-0 flex items-center justify-center"
                  >
                    <!-- Camera Feed Container -->
                    <div
                      class="relative w-full h-full aspect-video bg-slate-800/50"
                    >
                      {#if $processedImageStore.loading && !$processedImageStore.data}
                        <!-- Initial Loading State -->
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
                              >Loading processed image...</span
                            >
                          </div>
                        </div>
                      {:else if $processedImageStore.error}
                        <!-- Error State -->
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
                              >{$processedImageStore.error}</span
                            >
                            <button
                              class="text-xs bg-cyan-500 hover:bg-cyan-600 text-white px-3 py-1 rounded transition-colors"
                              on:click={fetchProcessedImage}
                            >
                              Retry
                            </button>
                          </div>
                        </div>
                      {:else if $processedImageStore.data && $processedImageStore.data.results?.img_result}
                        <!-- Processed Image -->
                        <img
                          src={`data:${processedImageMime};base64,${$processedImageStore.data.results.img_result}`}
                          alt="Processed Camera Feed"
                          class="w-full h-full object-cover"
                        />

                        <!-- Waiting for Update Overlay -->
                        {#if $processedImageStore.loading}
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
                              <span class="text-xs text-cyan-300">Updating...</span>
                            </div>
                          </div>
                        {/if}
                      {:else}
                        <!-- Fallback Skeleton -->
                        <div class="absolute inset-0 bg-slate-800/50 animate-pulse">
                          <div class="flex items-center justify-center h-full">
                            <span class="text-sm text-gray-400"
                              >No image available</span
                            >
                          </div>
                        </div>
                      {/if}

                      <!-- Measurement Grid Overlay -->
                      <div
                        class="absolute inset-0 grid grid-cols-4 grid-rows-4 pointer-events-none"
                      >
                        {#each Array(16) as _, i}
                          <div class="border border-orange-400/30"></div>
                        {/each}
                      </div>

                      <!-- Measurement Indicators -->
                      <div class="absolute inset-0 pointer-events-none">
                        <!-- Vertical scale - left side -->
                        <div
                          class="absolute left-2 top-8 bottom-2 flex flex-col justify-between text-xs text-orange-300 font-mono"
                        >
                          <span>100mm</span>
                          <span>75mm</span>
                          <span>50mm</span>
                          <span>25mm</span>
                          <span>0mm</span>
                        </div>
                        <!-- Horizontal scale - top -->
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
                  <div class="flex justify-between items-center mt-3 flex-shrink-0">
                    <div class="text-xs text-gray-400 font-mono">
                      CAMERA {selectedFaja.name}
                    </div>
                    <div class="flex flex-col space-y-1">
                      {#if $processedImageStore.lastUpdated}
                        <div
                          class="text-xs {$processedImageStore.loading
                            ? 'text-cyan-400'
                            : 'text-green-400'} font-mono"
                        >
                          {$processedImageStore.loading
                            ? "Updating..."
                            : `Updated: ${formattedTimestamp}`}
                        </div>
                      {:else if $processedImageStore.error}
                        <div class="text-xs text-red-400 font-mono">
                          Error: {$processedImageStore.error}
                        </div>
                      {:else}
                        <div class="text-xs text-yellow-400 font-mono">
                          Loading...
                        </div>
                      {/if}
                    </div>
                  </div>
                </div>
                <BallTrackingLineChart />
              </div>
            {/if}
          {/if}
        {/if}
      </div>
    </div>

    {#if false}
      <!-- Right sidebar + right-arrow toggle temporarily disabled -->
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
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M9 5l7 7-7 7"
            />
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
            fajas={[selectedFaja!]}
            {activeSidebarTab}
            setActiveSidebarTab={(i: number) => (activeSidebarTab = i)}
          />
        {/if}
      </div>
    {/if}
  </div>
{/if}
