import type { BallTrackingBackendPayload, GateStatus } from "$lib/stores";

type MillEvent = {
  time: number;
  mill: "M1" | "M2";
  count: number;
};

const WINDOW_MS = 15 * 60 * 1000;
const BUCKET_MS = 10_000;
const MAX_EVENTS = 3000;

const state: {
  gateStatus: GateStatus;
  activeMill: "M1" | "M2";
  nextGateSwitchAt: number;
  events: MillEvent[];
} = {
  gateStatus: "open",
  activeMill: "M1",
  nextGateSwitchAt: Date.now() + randomMs(20_000, 45_000),
  events: [],
};

function randomMs(min: number, max: number) {
  return Math.floor(min + Math.random() * (max - min));
}

function randomPulseCount() {
  const r = Math.random();
  if (r < 0.2) return 0;
  if (r < 0.45) return 1;
  if (r < 0.7) return 2;
  if (r < 0.9) return 3;
  return 4;
}

function tickSimulation() {
  const now = Date.now();
  if (now >= state.nextGateSwitchAt) {
    state.gateStatus = state.gateStatus === "open" ? "closed" : "open";
    state.activeMill = state.gateStatus === "open" ? "M1" : "M2";
    state.nextGateSwitchAt = now + randomMs(20_000, 45_000);
  }

  const pulse = randomPulseCount();
  if (pulse > 0) {
    state.events.push({ time: now, mill: state.activeMill, count: pulse });
    if (state.events.length > MAX_EVENTS) {
      state.events.splice(0, state.events.length - MAX_EVENTS);
    }
  }
}

function buildPayload(): BallTrackingBackendPayload {
  const end = Date.now();
  const start = end - WINDOW_MS;
  const bucketCount = Math.max(1, Math.ceil((end - start) / BUCKET_MS));
  const buckets = Array.from({ length: bucketCount }, (_, i) => ({
    time: start + i * BUCKET_MS,
    m1: 0,
    m2: 0,
    cumulM1: 0,
    cumulM2: 0,
  }));

  let baselineM1 = 0;
  let baselineM2 = 0;

  for (const event of state.events) {
    if (event.time < start) {
      if (event.mill === "M1") baselineM1 += event.count;
      else baselineM2 += event.count;
      continue;
    }
    if (event.time >= end) continue;
    const idx = Math.floor((event.time - start) / BUCKET_MS);
    if (idx < 0 || idx >= buckets.length) continue;
    if (event.mill === "M1") buckets[idx].m1 += event.count;
    else buckets[idx].m2 += event.count;
  }

  let runningM1 = baselineM1;
  let runningM2 = baselineM2;
  for (const bucket of buckets) {
    runningM1 += bucket.m1;
    runningM2 += bucket.m2;
    bucket.cumulM1 = runningM1;
    bucket.cumulM2 = runningM2;
  }

  return {
    bucketMs: BUCKET_MS,
    gateStatus: state.gateStatus,
    activeMill: state.activeMill,
    pulses: buckets.map((bucket) => ({
      time: bucket.time,
      m1: bucket.m1,
      m2: bucket.m2,
    })),
    cumulative: buckets.map((bucket) => ({
      time: bucket.time,
      m1: bucket.cumulM1,
      m2: bucket.cumulM2,
    })),
  };
}

export function startMillGraphSimulation(
  onData: (payload: BallTrackingBackendPayload) => void,
  intervalMs = 1000
) {
  const timer = setInterval(() => {
    tickSimulation();
    onData(buildPayload());
  }, intervalMs);

  onData(buildPayload());

  return () => clearInterval(timer);
}
