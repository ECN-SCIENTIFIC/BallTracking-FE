<script lang="ts">
  import { onDestroy, onMount, tick } from "svelte";
  import { browser } from "$app/environment";
  import {
    ballTrackingBackendStore,
    languageStore,
    translations,
    type BallTrackingBackendPayload,
    type MillSelection,
  } from "$lib/stores";
  import { startMillGraphSimulation } from "$lib/simulations/millGraphSimulation";
  import type { MillDefinition, BallTrackingChartsConfig } from "$lib/ballTracking/caseConfig";
  import { buildAccumulatedSeries, buildDetectionsSeries } from "$lib/ballTracking/chartSeries";

  /** When null, uses live `ballTrackingBackendStore` (optional override for tests). */
  export let payloadOverride: BallTrackingBackendPayload | null = null;
  export let mills: MillDefinition[] = [];
  export let chartConfig: BallTrackingChartsConfig;
  export let selectedMill: MillSelection = "all";

  $: t = translations[$languageStore];

  let ApexCharts: any = null;
  let pulseContainer: HTMLDivElement | undefined;
  let cumulativeContainer: HTMLDivElement | undefined;
  let combinedContainer: HTMLDivElement | undefined;
  let pulseChart: any = null;
  let cumulativeChart: any = null;
  let combinedChart: any = null;
  let stopFallbackSimulation: (() => void) | null = null;
  let fallbackPayload: BallTrackingBackendPayload | null = null;

  $: effectiveChartCfg =
    chartConfig.mode === "combined" &&
    chartConfig.compareMills &&
    mills.length > 1
      ? { ...chartConfig, compareMills: false }
      : chartConfig;

  $: livePayload = $ballTrackingBackendStore;
  $: payload = payloadOverride ?? livePayload;

  function baseChartStyle() {
    return {
      chart: {
        height: "100%",
        background: "transparent",
        foreColor: "#e2e8f0",
        parentHeightOffset: 0,
        toolbar: { show: false },
        zoom: { enabled: false },
        animations: { enabled: true, easing: "easeinout" as const, speed: 220 },
      },
      xaxis: {
        type: "datetime" as const,
        labels: {
          datetimeUTC: false,
          hideOverlappingLabels: true,
          formatter: (val: string | number) =>
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
        padding: {
          bottom: 10,
        },
      },
      legend: {
        position: "top" as const,
        horizontalAlign: "right" as const,
        labels: { colors: "#e2e8f0" },
      },
      noData: {
        text: t.waitingForUpdates,
        align: "center" as const,
        verticalAlign: "middle" as const,
        style: { color: "#94a3b8" },
      },
      tooltip: {
        theme: "dark" as const,
        x: { format: "HH:mm:ss" },
      },
    };
  }

  function refreshSeparateCharts() {
    if (!browser) return;

    const useFallback = !payload || (payload.pulses?.length ?? 0) === 0;
    const p = useFallback ? fallbackPayload : payload;
    const pulseSeries = buildDetectionsSeries(p, mills, selectedMill, effectiveChartCfg);
    const cumulativeSeries = buildAccumulatedSeries(p, mills, selectedMill, effectiveChartCfg);
    const bucketMs = p?.bucketMs ?? 10_000;

    if (pulseChart) {
      pulseChart.updateOptions(
        {
          yaxis: {
            min: 0,
            title: {
              text: `Pulsos / ${Math.round(bucketMs / 1000)}s`,
              style: { color: "#c9dee6" },
            },
          },
          noData: { text: t.waitingForUpdates, style: { color: "#94a3b8" } },
        },
        false,
        false,
      );
      pulseChart.updateSeries(pulseSeries, false);
    }
    if (cumulativeChart) {
      cumulativeChart.updateOptions(
        {
          noData: { text: t.waitingForUpdates, style: { color: "#94a3b8" } },
        },
        false,
        false,
      );
      cumulativeChart.updateSeries(cumulativeSeries, false);
    }
  }

  function refreshCombinedChart() {
    if (!browser || !combinedChart) return;

    const useFallback = !payload || (payload.pulses?.length ?? 0) === 0;
    const p = useFallback ? fallbackPayload : payload;
    const det = buildDetectionsSeries(p, mills, selectedMill, effectiveChartCfg);
    const acc = buildAccumulatedSeries(p, mills, selectedMill, effectiveChartCfg);
    const bucketMs = p?.bucketMs ?? 10_000;

    const detData = det[0]?.data ?? [];
    const accData = acc[0]?.data ?? [];

    combinedChart.updateOptions(
      {
        yaxis: [
          {
            min: 0,
            title: {
              text: `Pulsos / ${Math.round(bucketMs / 1000)}s`,
              style: { color: "#c9dee6" },
            },
            labels: { style: { colors: "#94a3b8" } },
          },
          {
            opposite: true,
            min: 0,
            title: { text: "Totales", style: { color: "#c9dee6" } },
            labels: { style: { colors: "#94a3b8" } },
          },
        ],
        noData: { text: t.waitingForUpdates, style: { color: "#94a3b8" } },
      },
      false,
      false,
    );

    combinedChart.updateSeries(
      [
        {
          name: "Detecciones",
          type: "column",
          data: detData,
        },
        {
          name: "Acumulado",
          type: "line",
          data: accData,
        },
      ],
      false,
    );
  }

  function refreshCharts() {
    if (chartConfig.mode === "combined") {
      refreshCombinedChart();
    } else {
      refreshSeparateCharts();
    }
  }

  function resizeAllCharts() {
    try {
      pulseChart?.resize();
      cumulativeChart?.resize();
      combinedChart?.resize();
    } catch {
      /* Apex can throw if chart was torn down mid-resize */
    }
  }

  let chartRootEl: HTMLDivElement | undefined;
  let resizeObserver: ResizeObserver | undefined;

  function initSeparate() {
    if (!browser || !ApexCharts) return;

    if (chartConfig.series.includes("detections") && pulseContainer) {
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
        colors: ["#3b82f6", "#f97316"],
      };
      pulseChart = new ApexCharts(pulseContainer, pulseOptions);
      pulseChart.render();
    }

    if (chartConfig.series.includes("accumulated") && cumulativeContainer) {
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
        colors: ["#3b82f6", "#f97316"],
      };
      cumulativeChart = new ApexCharts(cumulativeContainer, cumulativeOptions);
      cumulativeChart.render();
    }
  }

  function initCombined() {
    if (!browser || !ApexCharts || !combinedContainer) return;

    const options = {
      ...baseChartStyle(),
      chart: { ...baseChartStyle().chart, type: "line" as const, stacked: false },
      stroke: {
        width: [0, 3],
        curve: "smooth" as const,
      },
      plotOptions: {
        bar: { columnWidth: "55%", borderRadius: 2 },
      },
      dataLabels: { enabled: false },
      markers: { size: 0 },
      yaxis: [
        {
          min: 0,
          title: { text: "Pulsos", style: { color: "#c9dee6" } },
        },
        {
          opposite: true,
          min: 0,
          title: { text: "Totales", style: { color: "#c9dee6" } },
        },
      ],
      series: [],
    };

    combinedChart = new ApexCharts(combinedContainer, options);
    combinedChart.render();
  }

  $: if (browser) {
    void payload;
    void selectedMill;
    void effectiveChartCfg;
    void chartConfig.mode;
    void $languageStore;
    if (chartConfig.mode === "combined" && combinedChart) refreshCombinedChart();
    else if (chartConfig.mode === "separate" && (pulseChart || cumulativeChart)) {
      refreshSeparateCharts();
    }
  }

  onMount(() => {
    if (!browser) return;

    const onWinResize = () => {
      void tick().then(resizeAllCharts);
    };
    window.addEventListener("resize", onWinResize);

    void (async () => {
      const ApexChartsModule = await import("apexcharts");
      ApexCharts = ApexChartsModule.default;
      await tick();

      if (chartConfig.mode === "combined") {
        initCombined();
      } else {
        initSeparate();
      }

      stopFallbackSimulation = startMillGraphSimulation((pl) => {
        fallbackPayload = pl;
        refreshCharts();
      });
      refreshCharts();

      if (typeof ResizeObserver !== "undefined" && chartRootEl) {
        resizeObserver = new ResizeObserver(() => {
          void tick().then(resizeAllCharts);
        });
        resizeObserver.observe(chartRootEl);
      }
    })();

    return () => {
      window.removeEventListener("resize", onWinResize);
      resizeObserver?.disconnect();
      resizeObserver = undefined;
    };
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
    if (combinedChart) {
      combinedChart.destroy();
      combinedChart = null;
    }
    if (stopFallbackSimulation) {
      stopFallbackSimulation();
      stopFallbackSimulation = null;
    }
    resizeObserver?.disconnect();
    resizeObserver = undefined;
  });
</script>

<div bind:this={chartRootEl} class="w-full h-full min-h-0 min-w-0 max-w-full flex flex-col gap-4">
  {#if chartConfig.mode === "separate"}
    {#if chartConfig.series.includes("detections")}
      <div
        class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex-1 min-h-0 flex flex-col min-h-[200px]"
      >
        <div class="text-xs text-gray-300 font-medium mb-2">Pulsos de Deteccion</div>
        <div bind:this={pulseContainer} class="w-full flex-1 min-h-[180px]"></div>
      </div>
    {/if}
    {#if chartConfig.series.includes("accumulated")}
      <div
        class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex-1 min-h-0 flex flex-col min-h-[200px]"
      >
        <div class="text-xs text-gray-300 font-medium mb-2">Totales Acumulados</div>
        <div bind:this={cumulativeContainer} class="w-full flex-1 min-h-[180px]"></div>
      </div>
    {/if}
  {:else}
    <div
      class="bg-slate-800/50 backdrop-blur-sm border border-white/10 rounded-xl p-4 flex-1 min-h-0 flex flex-col min-h-[320px]"
    >
      <div class="text-xs text-gray-300 font-medium mb-2">Detecciones y acumulado</div>
      <div bind:this={combinedContainer} class="w-full flex-1 min-h-[280px]"></div>
    </div>
  {/if}
</div>
