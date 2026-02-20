const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.MOCK_BACKEND_PORT || 8000);
const HOST = process.env.MOCK_BACKEND_HOST || '127.0.0.1';

const GATE_OPEN = 'open';
const GATE_CLOSED = 'closed';
const MILL_M1 = 'M1';
const MILL_M2 = 'M2';
const MAX_EVENTS = 2500;
const IMAGE_MIME_BY_EXT = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml'
};

const state = {
  gateStatus: GATE_OPEN,
  activeMill: MILL_M1,
  nextGateSwitchAt: Date.now() + randomMs(25_000, 50_000),
  events: [], // { time, mill, count }
  totalM1: 0,
  totalM2: 0,
  lastPulse: 0,
  lastDetectionTimestamp: null
};

const placeholderImages = loadPlaceholderImages();
let imageCursor = 0;

function randomMs(min, max) {
  return Math.floor(min + Math.random() * (max - min));
}

function randomPulse() {
  const r = Math.random();
  if (r < 0.25) return 0;
  if (r < 0.5) return 1;
  if (r < 0.75) return 2;
  if (r < 0.92) return 3;
  return 4;
}

function loadFallbackImage() {
  // 1x1 PNG fallback
  const fallbackBase64 =
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/w8AAgMBAQEGQtcAAAAASUVORK5CYII=';
  return {
    mimeType: 'image/png',
    base64: fallbackBase64,
    buffer: Buffer.from(fallbackBase64, 'base64')
  };
}

function loadPlaceholderImages() {
  const mockcamDir = path.join(__dirname, 'static', 'mockcam');
  if (!fs.existsSync(mockcamDir)) return [loadFallbackImage()];

  const entries = fs.readdirSync(mockcamDir).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
  );

  const images = [];
  for (const entry of entries) {
    const fullPath = path.join(mockcamDir, entry);
    const ext = path.extname(entry).toLowerCase();
    const mimeType = IMAGE_MIME_BY_EXT[ext];
    if (!mimeType) continue;
    if (!fs.statSync(fullPath).isFile()) continue;

    const buffer = fs.readFileSync(fullPath);
    images.push({
      mimeType,
      base64: buffer.toString('base64'),
      buffer
    });
  }

  if (images.length === 0) return [loadFallbackImage()];
  return images;
}

function getNextPlaceholderImage() {
  const image = placeholderImages[imageCursor];
  imageCursor = (imageCursor + 1) % placeholderImages.length;
  return image;
}

function maybeSwitchGate(now) {
  if (now < state.nextGateSwitchAt) return;

  state.gateStatus = state.gateStatus === GATE_OPEN ? GATE_CLOSED : GATE_OPEN;
  state.activeMill = state.gateStatus === GATE_OPEN ? MILL_M1 : MILL_M2;
  state.nextGateSwitchAt = now + randomMs(25_000, 50_000);
}

function pushEvent(now, pulseCount) {
  if (pulseCount <= 0) return;
  const mill = state.activeMill;
  state.events.push({ time: now, mill, count: pulseCount });

  if (mill === MILL_M1) state.totalM1 += pulseCount;
  else state.totalM2 += pulseCount;

  state.lastPulse = pulseCount;
  state.lastDetectionTimestamp = now;

  if (state.events.length > MAX_EVENTS) {
    state.events.splice(0, state.events.length - MAX_EVENTS);
  }
}

function simulationTick() {
  const now = Date.now();
  maybeSwitchGate(now);
  const pulseCount = randomPulse();
  pushEvent(now, pulseCount);
}

function getWindowBounds() {
  const now = Date.now();
  const windowMs = 15 * 60 * 1000;
  return { start: now - windowMs, end: now };
}

function buildSeries(bucketMs = 10_000) {
  const { start, end } = getWindowBounds();
  const bucketCount = Math.max(1, Math.ceil((end - start) / bucketMs));
  const buckets = [];

  for (let i = 0; i < bucketCount; i++) {
    buckets.push({
      time: start + i * bucketMs,
      m1: 0,
      m2: 0,
      cumulM1: 0,
      cumulM2: 0
    });
  }

  let baselineM1 = 0;
  let baselineM2 = 0;

  for (const event of state.events) {
    if (event.time < start) {
      if (event.mill === MILL_M1) baselineM1 += event.count;
      else baselineM2 += event.count;
      continue;
    }
    if (event.time >= end) continue;

    const idx = Math.floor((event.time - start) / bucketMs);
    if (idx < 0 || idx >= buckets.length) continue;
    if (event.mill === MILL_M1) buckets[idx].m1 += event.count;
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

  return buckets;
}

function buildProcessImageResponse(image) {
  const now = Date.now();
  const buckets = buildSeries();
  const totalBalls = state.totalM1 + state.totalM2;

  return {
    status: 'ok',
    timestamp: Math.floor(now / 1000),
    message: 'Mock backend stream active',
    results: {
      fs_dict: {
        'F80 mm': Number((120 + Math.random() * 15).toFixed(3)),
      },
      fs_ajust_dict: {
        'F80 mm': Number((118 + Math.random() * 12).toFixed(3)),
      },
      img_result: image.base64,
      img_result_mime: image.mimeType,
      numero_bolas_img: state.lastPulse,
      conteo_bolas: totalBalls,
      last_detection_timestamp: state.lastDetectionTimestamp,
      masa_total: Number((totalBalls * 0.52).toFixed(2)),
      gate_status: state.gateStatus,
      active_mill: state.activeMill,
      ball_tracking: {
        bucket_ms: 10_000,
        pulses: buckets.map((bucket) => ({
          time: bucket.time,
          m1: bucket.m1,
          m2: bucket.m2
        })),
        cumulative: buckets.map((bucket) => ({
          time: bucket.time,
          m1: bucket.cumulM1,
          m2: bucket.cumulM2
        }))
      }
    }
  };
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  const url = req.url || '/';

  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (url === '/' && req.method === 'GET') {
    sendJson(res, 200, {
      message: 'Mock backend running',
      gate_status: state.gateStatus,
      active_mill: state.activeMill,
      service_status: {
        camera: true,
        inference: true,
        postprocess: true,
        db_service: true
      }
    });
    return;
  }

  if (url.startsWith('/process_image') && req.method === 'GET') {
    const image = getNextPlaceholderImage();
    sendJson(res, 200, buildProcessImageResponse(image));
    return;
  }

  if (url.startsWith('/frame') && req.method === 'GET') {
    const image = getNextPlaceholderImage();
    res.writeHead(200, {
      'Content-Type': image.mimeType,
      'Cache-Control': 'no-store',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(image.buffer);
    return;
  }

  sendJson(res, 404, { status: 'error', message: 'Not found' });
});

setInterval(simulationTick, 1000);

server.listen(PORT, HOST, () => {
  console.log(`Mock backend listening at http://${HOST}:${PORT}`);
  console.log('Gate open -> M1, gate closed -> M2');
});
