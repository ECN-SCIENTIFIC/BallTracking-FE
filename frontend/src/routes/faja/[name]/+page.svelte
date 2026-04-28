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
  import { onMount } from "svelte";
  import { get } from "svelte/store";
  import Sidebar from "$lib/Sidebar.svelte";
  import DashboardHeader from "$lib/components/DashboardHeader.svelte";
  import DashboardGrid from "$lib/components/DashboardGrid.svelte";
  import CameraFeedPanel from "$lib/components/CameraFeedPanel.svelte";
  import BallTrackingIndicators from "$lib/components/BallTrackingIndicators.svelte";
  import BallTrackingCharts from "$lib/components/BallTrackingCharts.svelte";
  import {
    processedImageStore,
    setProcessedImageLoading,
    setProcessedImageError,
    millSelectionStore,
    ballTrackingMillsStore,
    ballTrackingChartPrefsStore,
    ballTrackingShowCameraStore,
    ballTrackingInchancableStore,
    syncBallTrackingFromResolvedConfig,
    type MillSelection,
    languageStore,
    translations,
  } from "$lib/stores";
  import { loadConfig } from "$lib/runtimeConfig";
  import {
    buildMillSelectorOptions,
    coerceMillSelection,
  } from "$lib/ballTracking/mills";
  import { applyProcessImageFromApi, normalizeProcessImageResponse } from "$lib/ballTracking/normalize";

  $: mills = $ballTrackingMillsStore;
  $: chartPrefs = $ballTrackingChartPrefsStore;
  $: showCameraPanel = $ballTrackingShowCameraStore;
  $: inchancableFeature = $ballTrackingInchancableStore;

  $: t = translations[$languageStore];

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

  let selectedFaja: Faja | null = fajas[0] ?? null;

  let sidebarCollapsed = true;
  let activeSidebarTab = 0;
  let isDesktop = false;

  let currentTime = new Date();
  let formattedTimestamp = "";
  let lastImageHash: string | null = null;
  let imageChangeCount = 0;
  let responseTimestamp: number | null = null;

  let isLoading = true;
  let ballsCurrentFrame = 0;
  let ballsTotalCount = 0;
  let lastDetectionTimestamp: number | null = null;
  let inchancableValue: boolean | null = null;
  let inchancableStatusLabel = "0";

  const DESKTOP_MIN_WIDTH = 1024;

  function syncViewportLayout() {
    if (typeof window === "undefined") return;
    isDesktop = window.innerWidth >= DESKTOP_MIN_WIDTH;
  }

  $: millOptions = buildMillSelectorOptions(mills, t.allMills);
  $: showMillSelector = mills.length > 1;

  let ballResults: Record<string, unknown> = {};
  $: ballResults = ($processedImageStore.data?.results ?? {}) as Record<string, unknown>;
  $: processedImageMime =
    typeof ballResults.img_result_mime === "string" ? ballResults.img_result_mime : "image/jpeg";
  $: ballsCurrentFrame =
    typeof ballResults.numero_bolas_img === "number" ? ballResults.numero_bolas_img : 0;
  $: ballsTotalCount =
    typeof ballResults.conteo_bolas === "number" ? ballResults.conteo_bolas : 0;
  $: lastDetectionTimestamp =
    typeof ballResults.last_detection_timestamp === "number"
      ? ballResults.last_detection_timestamp
      : null;
  $: gateStatus =
    ballResults.gate_status === "closed" ? "closed" : "open";
  $: activeMill =
    typeof ballResults.active_mill === "string" ? ballResults.active_mill : "M1";

  $: backendInchancable = ballResults.inchancable;
  $: inchancableValue =
    backendInchancable !== undefined && backendInchancable !== null
      ? !!backendInchancable
      : null;
  $: inchancableStatusLabel =
    inchancableValue === null ? t.noSignal : inchancableValue ? t.active : t.inactive;

  $: lastDetectionDisplay = lastDetectionTimestamp
    ? new Date(lastDetectionTimestamp).toLocaleTimeString()
    : "None";

  $: shiftBallAccum =
    (typeof ballResults.conteo_bolas_turno === "number"
      ? ballResults.conteo_bolas_turno
      : undefined) ??
    (typeof ballResults.shift_ball_count === "number" ? ballResults.shift_ball_count : undefined) ??
    (typeof ballResults.shift_total_count === "number"
      ? ballResults.shift_total_count
      : undefined) ??
    ballsTotalCount;

  function firstNumber(...values: unknown[]) {
    return values.find((value): value is number => typeof value === "number");
  }

  function formatMetricNumber(value: number) {
    return Number.isInteger(value) ? String(value) : value.toFixed(1);
  }

  function getDayStart(now: Date) {
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    return start;
  }

  $: dayBallAccum =
    firstNumber(
      ballResults.conteo_bolas_dia,
      ballResults.conteo_bolas_day,
      ballResults.day_ball_count,
      ballResults.daily_ball_count,
      ballResults.daily_total_count,
    ) ?? ballsTotalCount;

  $: todayStart = getDayStart(currentTime);
  $: dayRangeDisplay = `${formatShiftTime(todayStart)} - ${formatShiftTime(currentTime)}`;

  $: backendBallFlowPerMinute = firstNumber(
    ballResults.ball_flow_per_minute,
    ballResults.balls_per_minute,
    ballResults.flujo_bolas_minuto,
  );
  $: backendBallFlowPerHour = firstNumber(
    ballResults.ball_flow_per_hour,
    ballResults.balls_per_hour,
    ballResults.flujo_bolas_hora,
  );
  $: elapsedTodayMinutes = Math.max(
    1,
    (currentTime.getTime() - todayStart.getTime()) / 60000,
  );
  $: derivedBallFlowPerMinute = dayBallAccum / elapsedTodayMinutes;
  $: ballFlowDisplay =
    backendBallFlowPerMinute !== undefined
      ? `${formatMetricNumber(backendBallFlowPerMinute)}/min`
      : backendBallFlowPerHour !== undefined
        ? `${formatMetricNumber(backendBallFlowPerHour)}/h`
        : elapsedTodayMinutes < 60
          ? `${formatMetricNumber(derivedBallFlowPerMinute)}/min`
          : `${formatMetricNumber(derivedBallFlowPerMinute * 60)}/h`;

  function formatShiftTime(value: unknown) {
    if (!value) return null;
    const timestamp =
      typeof value === "number" && value < 10000000000 ? value * 1000 : value;
    const date = new Date(timestamp as string | number | Date);
    if (Number.isNaN(date.getTime())) return null;

    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function getCurrentShiftRange(now: Date) {
    const start = new Date(now);
    const end = new Date(now);

    if (now.getHours() >= 8 && now.getHours() < 20) {
      start.setHours(8, 0, 0, 0);
      end.setHours(20, 0, 0, 0);
    } else {
      if (now.getHours() < 8) {
        start.setDate(start.getDate() - 1);
      } else {
        end.setDate(end.getDate() + 1);
      }
      start.setHours(20, 0, 0, 0);
      end.setHours(8, 0, 0, 0);
    }

    return `${formatShiftTime(start)} - ${formatShiftTime(end)}`;
  }

  $: shiftStartDisplay = formatShiftTime(
    ballResults.shift_start_timestamp ??
      ballResults.shift_start_time ??
      ballResults.turno_inicio,
  );
  $: shiftEndDisplay = formatShiftTime(
    ballResults.shift_end_timestamp ??
      ballResults.shift_end_time ??
      ballResults.turno_fin,
  );
  $: shiftRangeDisplay =
    shiftStartDisplay && shiftEndDisplay
      ? `${shiftStartDisplay} - ${shiftEndDisplay}`
      : getCurrentShiftRange(currentTime);

  $: pageTitle = `${t.ballTracking}`;
  $: pageSubtitle = t.ballDetectionOverview;
  $: dataFeedStatus = $processedImageStore.error
    ? { value: t.error, tone: "red" as const }
    : $processedImageStore.loading
      ? { value: t.updating, tone: "yellow" as const }
      : $processedImageStore.data
        ? { value: "Live", tone: "green" as const }
        : { value: t.waitingForUpdates, tone: "gray" as const };
  $: cameraStatus = showCameraPanel
    ? { value: "Enabled", tone: "cyan" as const }
    : { value: "Hidden", tone: "gray" as const };
  $: headerStatusIndicators = [
    { label: "Data feed", ...dataFeedStatus },
    { label: "Camera", ...cameraStatus },
  ];

  function selectMill(value: string) {
    millSelectionStore.set(value as MillSelection);
  }

  $: {
    const coerced = coerceMillSelection($millSelectionStore, mills);
    if (coerced !== $millSelectionStore) {
      millSelectionStore.set(coerced);
    }
  }

  async function fetchProcessedImage() {
    if (!$processedImageStore.data) {
      setProcessedImageLoading(true);
    }
    setProcessedImageError(null);

    try {
      const config = await loadConfig();
      syncBallTrackingFromResolvedConfig(config);
      millSelectionStore.update((sel) =>
        coerceMillSelection(sel, config.millsResolved),
      );

      const res = await fetch(`${config.apiBaseUrl}/process_image`);
      if (res.status === 204) {
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = await res.json();

      const { error } = applyProcessImageFromApi(raw, {
        requireImage: get(ballTrackingShowCameraStore),
      });

      if (error) {
        setProcessedImageError(error);
      } else {
        setProcessedImageError(null);
      }

      const normalized = normalizeProcessImageResponse(raw);
      if (normalized?.results?.img_result) {
        const newImageHash = normalized.results.img_result.substring(0, 50);
        if (newImageHash !== lastImageHash) {
          imageChangeCount++;
          lastImageHash = newImageHash;
        }
      }
      responseTimestamp =
        typeof (raw as { timestamp?: number }).timestamp === "number"
          ? (raw as { timestamp: number }).timestamp
          : null;
    } catch (e: unknown) {
      const errorMessage =
        e instanceof Error ? e.message : "Failed to load processed image";
      setProcessedImageError(errorMessage);
    } finally {
      setProcessedImageLoading(false);
      isLoading = false;
    }
  }

  onMount(() => {
    syncViewportLayout();

    const mql = window.matchMedia(`(min-width: ${DESKTOP_MIN_WIDTH}px)`);
    const onMqChange = () => {
      syncViewportLayout();
    };
    mql.addEventListener("change", onMqChange);
    window.addEventListener("resize", syncViewportLayout);

    fetchProcessedImage();
    const imageInterval = setInterval(fetchProcessedImage, 2000);
    const timeInterval = setInterval(() => {
      currentTime = new Date();
    }, 1000);

    return () => {
      mql.removeEventListener("change", onMqChange);
      window.removeEventListener("resize", syncViewportLayout);
      clearInterval(imageInterval);
      clearInterval(timeInterval);
    };
  });

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
        formattedTimestamp = $processedImageStore.lastUpdated.toLocaleTimeString("en-US", {
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
  :global(html),
  :global(body) {
    background-color: #111827;
    margin: 0;
    padding: 0;
    min-height: 100vh;
  }

  :global(*) {
    box-sizing: border-box;
  }
</style>

{#if selectedFaja}
  <div class="flex h-screen min-h-0 min-w-0 bg-gray-900 text-white overflow-hidden">
    <div class="flex-1 flex flex-col min-h-0 min-w-0 overflow-hidden">
      <div
        class="w-full max-w-full min-w-0 p-6 flex flex-col h-full min-h-0 overflow-y-auto overflow-x-hidden"
      >
        <DashboardHeader
          {pageTitle}
          {pageSubtitle}
          {gateStatus}
          {activeMill}
          {showMillSelector}
          millOptions={millOptions.map((o) => ({ value: o.value, label: o.label }))}
          selectedMill={$millSelectionStore}
          statusIndicators={headerStatusIndicators}
          onSelectMill={selectMill}
        />

        <BallTrackingIndicators
          {t}
          {formattedTimestamp}
          waitingLabel={t.waitingForUpdates}
          {ballsCurrentFrame}
          {ballsTotalCount}
          {lastDetectionDisplay}
          inchancable={inchancableFeature}
          {inchancableValue}
          {inchancableStatusLabel}
          {shiftBallAccum}
          {shiftRangeDisplay}
          {dayBallAccum}
          {dayRangeDisplay}
          {ballFlowDisplay}
        />

        {#if isLoading}
          <div class="animate-pulse">
            {#if isDesktop}
              <div
                class="grid grid-cols-12 gap-4 flex-1 min-h-0 items-stretch min-h-[480px]"
              >
                {#if showCameraPanel}
                  <div
                    class={chartPrefs.series.length
                      ? "col-span-6 flex flex-col min-h-0 h-full self-stretch"
                      : "col-span-12 flex flex-col min-h-0 h-full self-stretch"}
                  >
                    <div
                      class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex-1 min-h-[360px]"
                    >
                      <div class="h-4 bg-slate-700 rounded w-1/3 mb-4"></div>
                      <div class="bg-slate-900/50 rounded-lg h-[400px]"></div>
                    </div>
                  </div>
                {/if}
                {#if chartPrefs.series.length}
                  <div
                    class={showCameraPanel
                      ? "col-span-6 flex flex-col gap-4 min-h-0 h-full self-stretch"
                      : "col-span-12 flex flex-col gap-4 min-h-0 h-full self-stretch"}
                  >
                    <div class="bg-slate-800/50 rounded-xl p-4 flex-1 min-h-[360px]"></div>
                    {#if chartPrefs.mode === "separate"}
                      <div class="bg-slate-800/50 rounded-xl p-4 flex-1 min-h-[360px]"></div>
                    {/if}
                  </div>
                {/if}
              </div>
            {:else}
              <div class="flex flex-col gap-4">
                {#if showCameraPanel}
                  <div class="bg-slate-800/50 rounded-xl p-4 h-[250px]"></div>
                {/if}
                {#if chartPrefs.series.length}
                  <div class="bg-slate-800/50 rounded-xl p-4 h-[200px]"></div>
                  {#if chartPrefs.mode === "separate"}
                    <div class="bg-slate-800/50 rounded-xl p-4 h-[200px]"></div>
                  {/if}
                {/if}
              </div>
            {/if}
          </div>
        {:else}
            <!-- Remount when layout changes: ApexCharts only initializes in onMount -->
            {#key `${chartPrefs.mode}-${chartPrefs.compareMills}-${chartPrefs.series.join(",")}-${showCameraPanel ? "cam" : "nocam"}-${isDesktop ? "lg" : "sm"}`}
              <DashboardGrid showCamera={showCameraPanel} showCharts={chartPrefs.series.length > 0} {isDesktop}>
                <svelte:fragment slot="camera">
                  {#if showCameraPanel}
                    {#if isDesktop}
                      <CameraFeedPanel
                        title={t.granulometriaCamara}
                        processedImageStore={processedImageStore}
                        {processedImageMime}
                        {formattedTimestamp}
                        waitingLabel={t.waitingForUpdates}
                        loadingLabel={t.loadingProcessedImage}
                        retryLabel={t.retry}
                        updatingLabel={t.updating}
                        updatedPrefix={t.updated}
                        errorPrefix={t.error}
                        loadingLabelShort={t.loading}
                        noImageLabel={t.noImageAvailable}
                        onRetry={fetchProcessedImage}
                      />
                    {:else}
                      <CameraFeedPanel
                        title={t.granulometriaCamara}
                        processedImageStore={processedImageStore}
                        {processedImageMime}
                        {formattedTimestamp}
                        waitingLabel={t.waitingForUpdates}
                        loadingLabel={t.loadingProcessedImage}
                        retryLabel={t.retry}
                        updatingLabel={t.updating}
                        updatedPrefix={t.updated}
                        errorPrefix={t.error}
                        loadingLabelShort={t.loading}
                        noImageLabel={t.noImageAvailable}
                        minHeightStyle="min-height: 400px;"
                        onRetry={fetchProcessedImage}
                      />
                    {/if}
                  {/if}
                </svelte:fragment>
                <svelte:fragment slot="charts">
                  {#if chartPrefs.series.length}
                    <BallTrackingCharts
                      {mills}
                      chartConfig={chartPrefs}
                      selectedMill={$millSelectionStore}
                    />
                  {/if}
                </svelte:fragment>
              </DashboardGrid>
            {/key}
        {/if}
      </div>
    </div>

    <button
        class="fixed top-4 right-2 z-30 bg-slate-700/80 backdrop-blur-sm hover:bg-slate-600/80 text-white rounded-full p-2 focus:outline-none border border-white/10 mr-4"
        on:click={() => (sidebarCollapsed = !sidebarCollapsed)}
        aria-label="Toggle sidebar"
        style="pointer-events: auto;"
        type="button"
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
            showBallTrackingLayoutControls={true}
          />
        {/if}
      </div>
  </div>
{/if}
