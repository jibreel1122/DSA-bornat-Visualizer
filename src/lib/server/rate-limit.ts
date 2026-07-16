const attempts = new Map<string, { count: number; reset: number }>();

/** Small process-local guard. Use a reverse-proxy / Redis limiter when horizontally scaling. */
export function allowRateLimit(key: string, limit = 8, windowMs = 15 * 60_000) {
  const now = Date.now();
  const entry = attempts.get(key);
  if (!entry || entry.reset <= now) {
    attempts.set(key, { count: 1, reset: now + windowMs });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

