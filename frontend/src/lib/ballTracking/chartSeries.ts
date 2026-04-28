import type { BallTrackingBackendPayload, MillSelection, MillSeriesPoint } from "$lib/stores";
import type { MillDefinition } from "./caseConfig";
import type { BallTrackingChartsConfig } from "./caseConfig";

export const DEFAULT_MILL_COLORS: Record<string, string> = {
  M1: "#3b82f6",
  M2: "#f97316",
};

function colorForMill(id: string, index: number): string {
  if (DEFAULT_MILL_COLORS[id]) return DEFAULT_MILL_COLORS[id];
  const palette = ["#22d3ee", "#a78bfa", "#34d399", "#fb7185", "#fbbf24"];
  return palette[index % palette.length];
}

function valueForMill(point: MillSeriesPoint, millId: string): number {
  if (millId === "M1") return point.m1;
  if (millId === "M2") return point.m2;
  return 0;
}

export function buildDetectionsSeries(
  payload: BallTrackingBackendPayload | null,
  mills: MillDefinition[],
  selection: MillSelection,
  chartCfg: BallTrackingChartsConfig,
): Array<{ name: string; data: { x: number; y: number | null }[]; color: string }> {
  if (!payload) return [];
  const pulses = payload.pulses ?? [];
  const isAll = selection === "all" || selection === "ALL";

  if (isAll && chartCfg.compareMills && mills.length > 1) {
    return mills.map((m, i) => ({
      name: m.label,
      data: pulses.map((p) => ({
        x: p.time,
        y: valueForMill(p, m.id) > 0 ? valueForMill(p, m.id) : null,
      })),
      color: colorForMill(m.id, i),
    }));
  }

  if (isAll && !chartCfg.compareMills && mills.length > 1) {
    return [
      {
        name: "Total",
        data: pulses.map((p) => ({
          x: p.time,
          y: mills.reduce((s, m) => s + valueForMill(p, m.id), 0) || null,
        })),
        color: "#22d3ee",
      },
    ];
  }

  const millId = mills.length === 1 ? mills[0].id : selection;
  const idx = mills.findIndex((m) => m.id === millId);
  return [
    {
      name: mills.find((m) => m.id === millId)?.label ?? millId,
      data: pulses.map((p) => {
        const v = valueForMill(p, millId);
        return { x: p.time, y: v > 0 ? v : null };
      }),
      color: colorForMill(millId, Math.max(0, idx)),
    },
  ];
}

export function buildAccumulatedSeries(
  payload: BallTrackingBackendPayload | null,
  mills: MillDefinition[],
  selection: MillSelection,
  chartCfg: BallTrackingChartsConfig,
): Array<{ name: string; data: { x: number; y: number }[]; color: string }> {
  if (!payload) return [];
  const cumulative = payload.cumulative ?? [];
  const isAll = selection === "all" || selection === "ALL";

  if (isAll && chartCfg.compareMills && mills.length > 1) {
    return mills.map((m, i) => ({
      name: m.label,
      data: cumulative.map((p) => ({ x: p.time, y: valueForMill(p, m.id) ?? 0 })),
      color: colorForMill(m.id, i),
    }));
  }

  if (isAll && !chartCfg.compareMills && mills.length > 1) {
    return [
      {
        name: "Total",
        data: cumulative.map((p) => ({
          x: p.time,
          y: mills.reduce((s, m) => s + (valueForMill(p, m.id) ?? 0), 0),
        })),
        color: "#22d3ee",
      },
    ];
  }

  const millId = mills.length === 1 ? mills[0].id : selection;
  const idx = mills.findIndex((m) => m.id === millId);
  return [
    {
      name: mills.find((m) => m.id === millId)?.label ?? millId,
      data: cumulative.map((p) => ({ x: p.time, y: valueForMill(p, millId) ?? 0 })),
      color: colorForMill(millId, Math.max(0, idx)),
    },
  ];
}
