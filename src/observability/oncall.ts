/**
 * OnCall AI observability — vendored, self-contained integration (no deps).
 *
 * Ships three signals to the OnCall AI platform's `POST /api/v1/ingest`:
 *   1. one `info` log event per completed HTTP request
 *      (endpoint, method, status, latency_ms) — powers per-endpoint
 *      performance scores + breach prediction;
 *   2. one `error` event (message + stack) per unhandled 5xx — powers
 *      incident detection + AI investigation;
 *   3. a `host_metrics` reading every ~5s — REAL process CPU%, REAL memory%,
 *      and REAL MySQL connection-pool utilization read live from the mysql2
 *      pool — powers the AI EARLY WARNING (resource-exhaustion prediction).
 *
 * Fail-silent by design: telemetry never throws, never blocks a request, and
 * a dead collector cannot leak memory (bounded queue, oldest dropped). Remove
 * `app.use(...)` + the sampler and the app behaves exactly as before.
 */

import os from 'node:os';
import type { Pool } from 'mysql2/promise';

/* ── config (env, with local-dev defaults) ──────────────────────────────── */

const INGEST_URL =
  process.env.ONCALL_INGEST_URL ?? 'http://localhost:3001/api/v1/ingest';
const API_KEY = process.env.ONCALL_API_KEY ?? 'dev-local-ingest-key';
const SERVICE = process.env.ONCALL_SERVICE ?? 'surat-salon-api';
const ENABLED = (process.env.ONCALL_ENABLED ?? 'true') !== 'false';

const FLUSH_MS = 2000;
const BATCH_SIZE = 50;
const MAX_QUEUE = 5000;
const HOST_SAMPLE_MS = 5000;
/** The mysql2 pool ceiling (mirrors `connectionLimit` in DatabaseService). */
const POOL_LIMIT = 10;

/* ── wire shapes (platform ingest contract) ─────────────────────────────── */

interface LogEventWire {
  timestamp: number;
  service: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  stack?: string | null;
  endpoint?: string | null;
  method?: string | null;
  status?: number | null;
  latency_ms?: number | null;
}

interface HostMetricWire {
  host: string;
  service: string;
  timestamp: number;
  cpu_pct: number;
  mem_pct: number;
  db_pool_pct: number | null;
  event_loop_lag_ms: number | null;
}

/* ── batched fail-silent shipper ────────────────────────────────────────── */

const queue: LogEventWire[] = [];
let hostReading: HostMetricWire | null = null;
let flushTimer: ReturnType<typeof setInterval> | null = null;

function enqueue(event: LogEventWire): void {
  if (!ENABLED) return;
  queue.push(event);
  while (queue.length > MAX_QUEUE) queue.shift();
  if (queue.length >= BATCH_SIZE) void flush();
}

async function flush(): Promise<void> {
  if (queue.length === 0 && hostReading === null) return;
  const events = queue.splice(0, 500);
  const host_metrics = hostReading ? [hostReading] : [];
  hostReading = null;
  try {
    const body: Record<string, unknown> = {};
    if (events.length > 0) body.events = events;
    if (host_metrics.length > 0) body.host_metrics = host_metrics;
    if (Object.keys(body).length === 0) return;
    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 5000);
    (to as { unref?: () => void }).unref?.();
    await fetch(INGEST_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-ingest-key': API_KEY,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    }).catch(() => undefined);
    clearTimeout(to);
  } catch {
    // fail-silent: observability must never impact the app
  }
}

/* ── 1) request middleware (Express-compatible; `app.use(...)` in main.ts) ── */

/** Collapse numeric/uuid path segments so ids don't explode the endpoint set. */
function normalizeEndpoint(url: string): string {
  const path = url.split('?')[0] ?? '/';
  return path
    .split('/')
    .map((seg) =>
      /^\d+$/.test(seg) || /^[0-9a-f-]{16,}$/i.test(seg) ? ':id' : seg,
    )
    .join('/');
}

interface MinimalReq {
  method?: string;
  originalUrl?: string;
  url?: string;
}
interface MinimalRes {
  statusCode?: number;
  on(event: string, cb: () => void): unknown;
}

export function oncallMiddleware() {
  return (req: MinimalReq, res: MinimalRes, next: () => void): void => {
    const start = Date.now();
    let done = false;
    const finish = (): void => {
      if (done) return;
      done = true;
      const endpoint = normalizeEndpoint(req.originalUrl ?? req.url ?? '/');
      enqueue({
        timestamp: Date.now(),
        service: SERVICE,
        level: 'info',
        message: `${req.method ?? 'GET'} ${endpoint}`,
        endpoint,
        method: req.method ?? null,
        status: res.statusCode ?? null,
        latency_ms: Date.now() - start,
      });
    };
    res.on('finish', finish);
    res.on('close', finish);
    next();
  };
}

/* ── 2) error capture (call from the global exception filter) ───────────── */

export function oncallCaptureError(
  req: { method?: string; originalUrl?: string; url?: string },
  exception: unknown,
  status: number,
): void {
  // 4xx are normal API traffic (auth failures, validation) — only ship 5xx.
  if (status < 500) return;
  const err = exception instanceof Error ? exception : new Error(String(exception));
  enqueue({
    timestamp: Date.now(),
    service: SERVICE,
    level: 'error',
    message: err.message,
    stack: err.stack ?? null,
    endpoint: normalizeEndpoint(req.originalUrl ?? req.url ?? '/'),
    method: req.method ?? null,
    status,
  });
}

/* ── 3) host sampler — real CPU / memory / MySQL pool utilization ───────── */

let lastCpu: NodeJS.CpuUsage | undefined;
let lastCpuAt: number | undefined;

function processCpuPct(now: number): number {
  const usage = process.cpuUsage();
  if (lastCpu === undefined || lastCpuAt === undefined) {
    lastCpu = usage;
    lastCpuAt = now;
    return 0;
  }
  const elapsedMs = now - lastCpuAt;
  const deltaUs = usage.user - lastCpu.user + (usage.system - lastCpu.system);
  lastCpu = usage;
  lastCpuAt = now;
  if (elapsedMs <= 0) return 0;
  const cores = Math.max(1, os.cpus()?.length ?? 1);
  return Math.min(100, Math.max(0, (deltaUs / 1000 / (elapsedMs * cores)) * 100));
}

/**
 * REAL MySQL pool utilization from the mysql2 pool's live internals:
 * (open − free + queued) / connectionLimit. The internals are undocumented,
 * so every access is guarded — any shape change degrades to `null`, never
 * a crash.
 */
function poolUtilizationPct(pool: Pool): number | null {
  try {
    const inner = (pool as unknown as { pool?: Record<string, unknown> }).pool;
    if (!inner) return null;
    const all = (inner._allConnections as { length?: number } | undefined)?.length;
    const free = (inner._freeConnections as { length?: number } | undefined)?.length;
    const queued =
      (inner._connectionQueue as { length?: number } | undefined)?.length ?? 0;
    if (typeof all !== 'number' || typeof free !== 'number') return null;
    const used = Math.max(0, all - free) + queued;
    return Math.min(100, Math.max(0, (used / POOL_LIMIT) * 100));
  } catch {
    return null;
  }
}

/**
 * Start telemetry: the flush loop + the host sampler. Call once from
 * `bootstrap()` after the app is created, passing the mysql2 pool.
 */
export function startOncall(pool: Pool | null): void {
  if (!ENABLED || flushTimer) return;
  lastCpu = process.cpuUsage();
  lastCpuAt = Date.now();

  const sampler = setInterval(() => {
    const now = Date.now();
    hostReading = {
      host: os.hostname(),
      service: SERVICE,
      timestamp: now,
      cpu_pct: Math.round(processCpuPct(now) * 10) / 10,
      mem_pct:
        Math.round(
          Math.min(100, (process.memoryUsage().rss / (512 * 1024 * 1024)) * 100) * 10,
        ) / 10,
      db_pool_pct: pool ? poolUtilizationPct(pool) : null,
      event_loop_lag_ms: null,
    };
  }, HOST_SAMPLE_MS);
  sampler.unref?.();

  flushTimer = setInterval(() => void flush(), FLUSH_MS);
  flushTimer.unref?.();
}
