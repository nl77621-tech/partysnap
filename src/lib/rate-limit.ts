/**
 * In-memory sliding-window rate limiter.
 *
 * Deliberately dependency-free: the app runs as a single Railway service, so a
 * process-local limiter is enough to stop the realistic abuse case (one client
 * or script hammering the public upload endpoint). Its limits:
 *
 *   - state resets when the process restarts
 *   - state is not shared if the service is ever scaled to multiple instances
 *
 * Because of that, and because the IP it keys on comes from a spoofable
 * header, callers should pair it with a durable backstop (see the per-party
 * check in /api/upload, which counts real rows in Postgres and therefore
 * cannot be bypassed by forging headers or by a restart).
 */

interface Bucket {
  count: number;
  bytes: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Bound memory: once the map gets large, drop everything already expired.
const SWEEP_THRESHOLD = 5_000;

function sweep(now: number) {
  // forEach rather than for..of: the project targets a TS level without
  // downlevelIteration. Deleting during a Map forEach is well-defined.
  buckets.forEach((bucket, key) => {
    if (bucket.resetAt <= now) buckets.delete(key);
  });
}

export interface RateLimitOptions {
  /** Window length in milliseconds. */
  windowMs: number;
  /** Max requests allowed per window. */
  max: number;
  /** Optional cap on total bytes per window. */
  maxBytes?: number;
  /** Bytes this request will consume, counted against maxBytes. */
  bytes?: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Seconds until the window resets. Send as Retry-After. */
  retryAfter: number;
  reason?: "requests" | "bytes";
}

/**
 * Records a hit against `key` and reports whether it is allowed.
 * A rejected request is NOT counted, so a client that backs off recovers
 * as soon as its window rolls over.
 */
export function rateLimit(key: string, opts: RateLimitOptions): RateLimitResult {
  const now = Date.now();
  const { windowMs, max, maxBytes, bytes = 0 } = opts;

  if (buckets.size > SWEEP_THRESHOLD) sweep(now);

  let bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, bytes: 0, resetAt: now + windowMs };
    buckets.set(key, bucket);
  }

  const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));

  if (bucket.count >= max) {
    return { ok: false, retryAfter, reason: "requests" };
  }
  if (maxBytes !== undefined && bucket.bytes + bytes > maxBytes) {
    return { ok: false, retryAfter, reason: "bytes" };
  }

  bucket.count += 1;
  bucket.bytes += bytes;
  return { ok: true, retryAfter };
}

/**
 * Best-effort client IP.
 *
 * x-forwarded-for is client-controlled and can be forged, so this is only a
 * coarse grouping key, never an identity or an authorization input. We take
 * the left-most entry (the conventional client position) and fall back to a
 * shared bucket when no header is present, so header-less clients still get
 * limited rather than escaping the limiter entirely.
 */
export function clientKey(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return headers.get("x-real-ip")?.trim() || "unknown";
}
