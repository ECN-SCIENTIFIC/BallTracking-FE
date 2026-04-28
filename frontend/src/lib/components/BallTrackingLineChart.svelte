<script lang="ts">
  /**
   * Back-compat wrapper: same separate dual-chart layout as the default case.
   * Prefer `BallTrackingCharts.svelte` with explicit mills + `BallTrackingChartsConfig`.
   */
  import BallTrackingCharts from "$lib/components/BallTrackingCharts.svelte";
  import type { BallTrackingChartsConfig } from "$lib/ballTracking/caseConfig";
  import { millSelectionStore } from "$lib/stores";

  export let mills: { id: string; label: string }[] = [
    { id: "M1", label: "M1" },
    { id: "M2", label: "M2" },
  ];

  export let chartConfig: BallTrackingChartsConfig = {
    mode: "separate",
    series: ["detections", "accumulated"],
    compareMills: true,
  };
</script>

<BallTrackingCharts {mills} {chartConfig} selectedMill={$millSelectionStore} />
