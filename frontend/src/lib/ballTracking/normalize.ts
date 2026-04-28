import type { ProcessImageResponse } from "$lib/types";
import type { BallTrackingBackendPayload } from "$lib/stores";
import { ballTrackingBackendStore, updateProcessedImage } from "$lib/stores";

function normalizeGateStatus(v: unknown): "open" | "closed" {
  return v === "closed" ? "closed" : "open";
}

function normalizeActiveMill(v: unknown): string {
  if (v === "M1" || v === "M2") return v;
  if (typeof v === "string" && v.length > 0) return v;
  return "M1";
}

/**
 * Build backend chart payload from API JSON (same shape as today).
 */
export function extractBallTrackingPayload(data: unknown): BallTrackingBackendPayload | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const results = d.results as Record<string, unknown> | undefined;
  if (!results || typeof results !== "object") return null;

  const tracking = results.ball_tracking as Record<string, unknown> | undefined;
  if (
    !tracking ||
    !Array.isArray(tracking.pulses) ||
    !Array.isArray(tracking.cumulative)
  ) {
    return null;
  }

  return {
    bucketMs: typeof tracking.bucket_ms === "number" ? tracking.bucket_ms : 10_000,
    gateStatus: normalizeGateStatus(results.gate_status),
    activeMill: normalizeActiveMill(results.active_mill),
    pulses: tracking.pulses as BallTrackingBackendPayload["pulses"],
    cumulative: tracking.cumulative as BallTrackingBackendPayload["cumulative"],
  };
}

/**
 * Merge loose API body into a full ProcessImageResponse for the store.
 */
export function normalizeProcessImageResponse(data: unknown): ProcessImageResponse | null {
  if (!data || typeof data !== "object") return null;
  const d = data as Record<string, unknown>;
  const results = (d.results as Record<string, unknown> | undefined) ?? {};
  const r = results as Partial<ProcessImageResponse["results"]>;

  return {
    status: typeof d.status === "string" ? d.status : "ok",
    timestamp: typeof d.timestamp === "number" ? d.timestamp : undefined,
    message: typeof d.message === "string" ? d.message : undefined,
    results: {
      fs_dict:
        r.fs_dict && typeof r.fs_dict === "object"
          ? r.fs_dict
          : {},
      fs_ajust_dict:
        r.fs_ajust_dict && typeof r.fs_ajust_dict === "object"
          ? r.fs_ajust_dict
          : {},
      img_result: typeof r.img_result === "string" ? r.img_result : undefined,
      img_result_mime: typeof r.img_result_mime === "string" ? r.img_result_mime : undefined,
      numero_bolas_img: typeof r.numero_bolas_img === "number" ? r.numero_bolas_img : undefined,
      conteo_bolas: typeof r.conteo_bolas === "number" ? r.conteo_bolas : undefined,
      last_detection_timestamp: r.last_detection_timestamp,
      masa_total: typeof r.masa_total === "number" ? r.masa_total : undefined,
      total_mass: typeof r.total_mass === "number" ? r.total_mass : undefined,
      mass: typeof r.mass === "number" ? r.mass : undefined,
      gate_status: r.gate_status,
      active_mill: typeof r.active_mill === "string" ? r.active_mill : undefined,
      ball_tracking: r.ball_tracking,
      inchancable: typeof r.inchancable === "boolean" ? r.inchancable : undefined,
      conteo_bolas_turno: typeof r.conteo_bolas_turno === "number" ? r.conteo_bolas_turno : undefined,
      shift_ball_count: typeof r.shift_ball_count === "number" ? r.shift_ball_count : undefined,
      shift_total_count: typeof r.shift_total_count === "number" ? r.shift_total_count : undefined,
      shift_start_timestamp:
        typeof r.shift_start_timestamp === "number" ? r.shift_start_timestamp : undefined,
      shift_end_timestamp:
        typeof r.shift_end_timestamp === "number" ? r.shift_end_timestamp : undefined,
      shift_start_time: r.shift_start_time,
      shift_end_time: r.shift_end_time,
      turno_inicio: r.turno_inicio,
      turno_fin: r.turno_fin,
    },
  };
}

export type ApplyProcessImageOptions = {
  /** When false, still update chart payload but do not require img_result */
  requireImage: boolean;
};

/**
 * Updates ball tracking store from API body; optionally updates processed image store.
 */
export function applyProcessImageFromApi(
  raw: unknown,
  options: ApplyProcessImageOptions,
): { error: string | null } {
  const tracking = extractBallTrackingPayload(raw);
  if (tracking) {
    ballTrackingBackendStore.set(tracking);
  }

  const normalized = normalizeProcessImageResponse(raw);
  if (!normalized) {
    return { error: "Invalid response" };
  }

  const hasImage = Boolean(normalized.results.img_result);
  if (options.requireImage && !hasImage) {
    return { error: "No image data found in response" };
  }

  updateProcessedImage(normalized);
  return { error: null };
}
