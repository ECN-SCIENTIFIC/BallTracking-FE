/**
 * Shared types for ball-tracking charts (no deployment “case” presets).
 */

export type MillDefinition = { id: string; label: string };

export type ChartSeriesKind = "detections" | "accumulated";

export type BallTrackingChartsConfig = {
  mode: "combined" | "separate";
  series: ChartSeriesKind[];
  compareMills: boolean;
};
