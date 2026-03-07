interface RateLimitEntry {
  count: number
  resetAt: number
}

const store = new Map<string, RateLimitEntry>()

const WINDOW_MS = 60_000       // 1 minute
const MAX_REQUESTS = 20        // 20 requests per minute per IP
const MAX_TOKENS_PER_MIN = 100_000

// Clean up old entries every 5 minutes
setInterval(() => {
  const now = Date.now()
  Array.from(store.entries()).forEach(([key, entry]) => {
    if (entry.resetAt < now) store.delete(key)
  })
}, 5 * 60_000)

export interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetAt: number
  error?: string
}

export function checkRateLimit(ip: string): RateLimitResult {
  const now = Date.now()
  const key = `rl:${ip}`
  const entry = store.get(key)

  if (!entry || entry.resetAt < now) {
    store.set(key, { count: 1, resetAt: now + WINDOW_MS })
    return { allowed: true, remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_MS }
  }

  if (entry.count >= MAX_REQUESTS) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      error: `Rate limit exceeded. Try again in ${Math.ceil((entry.resetAt - now) / 1000)}s`,
    }
  }

  entry.count++
  return { allowed: true, remaining: MAX_REQUESTS - entry.count, resetAt: entry.resetAt }
}

export { MAX_TOKENS_PER_MIN }
