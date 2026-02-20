<script lang="ts">
  import { onDestroy, onMount } from "svelte";
  import { browser } from "$app/environment";
  import {
    ballTrackingBackendStore,
    languageStore,
    millSelectionStore,
    translations,
    type BallTrackingBackendPayload,
    type MillSelection,
  } from "$lib/stores";
  import { startMillGraphSimulation } from "$lib/simulations/millGraphSimulation";

  $: t = translations[$languageStore];

  const COLORS = {
    m1: "#3b82f6",
    m2: "#f97316",
  };

  let ApexCharts: any;
  let pulseContainer: HTMLDivElement;
  let cumulativeContainer: HTMLDivElement;
  let pulseChart: any;
  let cumulativeChart: any;
  let lastLanguage: string | null = null;
  let stopFallbackSimulation: (() => void) | null = null;
  let fallbackPayload: BallTrackingBackendPayload | null = null;

  // Legacy timeline placeholder kept intentionally so old path remains in file.
  const LEGACY_TIMELINE_PRESERVED = true;

  function buildPulseSeries(payload: BallTrackingBackendPayload | null, selection: MillSelection) {
    if (!payload) return [];

    const pulses = payload.pulses ?? [];
    const m1Data = pulses.map((point) => ({ x: point.time, y: point.m1 > 0 ? point.m1 : null }));
    const m2Data = pulses.map((point) => ({ x: point.time, y: point.m2 > 0 ? point.m2 : null }));

    if (selection === "M1") return [{ name: "M1", data: m1Data, color: COLORS.m1 }];
    if (selection === "M2") return [{ name: "M2", data: m2Data, color: COLORS.m2 }];
    return [
      { name: "M1", data: m1Data, color: COLORS.m1 },
      { name: "M2", data: m2Data, color: COLORS.m2 },
    ];
  }

  function buildCumulativeSeries(payload: BallTrackingBackendPayload | null, selection: MillSelection) {
    if (!payload) return [];

    const cumulative = payload.cumulative ?? [];
    const m1Data = cumulative.map((point) => ({ x: point.time, y: point.m1 ?? 0 }));
    const m2Data = cumulative.map((point) => ({ x: point.time, y: point.m2 ?? 0 }));

    if (selection === "M1") return [{ name: "M1", data: m1Data, color: COLORS.m1 }];
    if (selection === "M2") return [{ name: "M2", data: m2Data, color: COLORS.m2 }];
    return [
      { name: "M1", data: m1Data, color: COLORS.m1 },
      { name: "M2", data: m2Data, color: COLORS.m2 },
    ];
  }

  function baseChartStyle() {
    return {
      chart: {
        height: "100%",
        background: "transparent",
        foreColor: "#e2e8f0",
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: true, easing: "easeinout", speed: 220 },
      },
      xaxis: {
        type: "datetime",
        labels: {
          datetimeUTC: false,
          hideOverlappingLabels: true,
          formatter: (val: number) =>
            new Date(val).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            }),
        },
      },
      grid: {
        borderColor: "#374151",
        strokeDashArray: 4,
      },
      legend: {
        position: "top",
        horizontalAlign: "right",
        labels: { colors: "#e2e8f0" },
      },
      noData: {
        text: t.waitingForUpdates,
        align: "center",
        verticalAlign: "middle",
        style: { color: "#94a3b8" },
      },
      tooltip: {
        theme: "dark",
        x: { format: "HH:mm:ss" },
      },
    };
  }

  function initializeCharts() {
    if (!browser || !pulseContainer || !cumulativeContainer) return;

    const pulseOptions = {
      ...baseChartStyle(),
      chart: { ...baseChartStyle().chart, type: "bar" },
      dataLabels: { enabled: false },
      plotOptions: {
        bar: {
          columnWidth: "80%",
          borderRadius: 2,
        },
      },
      yaxis: {
        min: 0,
        title: { text: "Pulsos", style: { color: "#c9dee6" } },
      },
      series: [],
      colors: [COLORS.m1, COLORS.m2],
    };

    const cumulativeOptions = {
      ...baseChartStyle(),
      chart: { ...baseChartStyle().chart, type: "line" },
      dataLabels: { enabled: false },
      stroke: { curve: "smooth", width: 2 },
      markers: { size: 0 },
      yaxis: {
        min: 0,
        title: { text: "Totales", style: { color: "#c9dee6" } },
      },
      series: [],
      colors: [COLORS.m1, COLORS.m2],
    };

    pulseChart = new ApexCharts(pulseContainer, pulseOptions);
    cumulativeChart = new ApexCharts(cumulativeContainer, cumulativeOptions);
    pulseChart.render();
    cumulativeChart.render();
  }

  function refreshCharts() {
    if (!browser || !pulseChart || !cumulativeChart) return;

    const selection = $millSelectionStore;
    const backendPayload = $ballTrackingBackendStore;
    const useFallback = !backendPayload || (backendPayload.pulses?.length ?? 0) === 0;
    const payload = useFallback ? fallbackPayload : backendPayload;
    const pulseSeries = buildPulseSeries(payload, selection);
    const cumulativeSeries = buildCumulativeSeries(payload, selection);
    const bucketMs = payload?.bucketMs ?? 10_000;

    pulseChart.updateOptions(
      {
        yaxis: {
          min: 0,
          title: { text: `Pulsos / ${Math.round(bucketMs / 1000)}s`, style: { color: "#c9dee6" } },
        },
        noData: {
          text: t.waitingForUpdates,
          style: { color: "#94a3b8" },
        },
      },
      false,
      false
    );
    cumulativeChart.updateOptions(
      {
        noData: {
          text: t.waitingForUpdates,
          style: { color: "#94a3b8" },
        },
      },
      false,
      false
    );

    pulseChart.updateSeries(pulseSeries, false);
    cumulativeChart.updateSeries(cumulativeSeries, false);
  }

  $: if (browser && pulseChart && cumulativeChart) {
    const lang = $languageStore as unknown as string;
    if (lang !== lastLanguage) {
      lastLanguage = lang;
    }
    refreshCharts();
  }

  onMount(async () => {
    if (!browser) return;
    const ApexChartsModule = await import("apexcharts");
    ApexCharts = ApexChartsModule.default;
    initializeCharts();
    stopFallbackSimulation = startMillGraphSimulation((payload) => {
      fallbackPayload = payload;
      refreshCharts();
    });
    refreshCharts();
  });

  onDestroy(() => {
    if (pulseChart) {
      pulseChart.destroy();
      pulseChart = null;
    }
    if (cumulativeChart) {
      cumulativeChart.destroy();
      cumulativeChart = null;
    }
    if (stopFallbackSimulation) {
      stopFallbackSimulation();
      stopFallbackSimulation = null;
    }
  });
</script>

<div class="w-full h-full min-h-0 flex flex-col gap-4">
  <div class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex-1 min-h-0 flex flex-col">
    <div class="text-xs text-gray-300 font-medium mb-2">Pulsos de Deteccion</div>
    <div bind:this={pulseContainer} class="w-full flex-1 min-h-0"></div>
  </div>

  <div class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex-1 min-h-0 flex flex-col">
    <div class="text-xs text-gray-300 font-medium mb-2">Totales Acumulados</div>
    <div bind:this={cumulativeContainer} class="w-full flex-1 min-h-0"></div>
  </div>

  {#if false && LEGACY_TIMELINE_PRESERVED}
    <!-- Legacy single-timeline chart intentionally preserved -->
    <div class="hidden"></div>
  {/if}
</div>
  