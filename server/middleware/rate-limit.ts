const rateLimitStore = new Map<string, { count: number; resetAt: number }>()

// Clean up expired entries every 5 minutes
const CLEANUP_INTERVAL = 5 * 60 * 1000
let lastCleanup = Date.now()

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL) return
  lastCleanup = now
  for (const [key, entry] of rateLimitStore) {
    if (now > entry.resetAt) {
      rateLimitStore.delete(key)
    }
  }
}

interface RateLimitConfig {
  windowMs: number
  maxRequests: number
}

// Different limits for different endpoint types
const RATE_LIMITS: Record<string, RateLimitConfig> = {
  auth: { windowMs: 60_000, maxRequests: 10 },       // 10 req/min for login/register
  api: { windowMs: 60_000, maxRequests: 60 },         // 60 req/min for general API
  admin: { windowMs: 60_000, maxRequests: 100 },      // 100 req/min for admin API
}

function getCategory(path: string): string {
  if (path.startsWith('/api/admin')) return 'admin'
  if (path.includes('/auth/') || path === '/api/me') return 'auth'
  if (path.startsWith('/api/')) return 'api'
  return ''
}

export default defineEventHandler((event) => {
  const path = event.path || ''
  const category = getCategory(path)
  if (!category) return // Only rate-limit API routes

  cleanup()

  const config = RATE_LIMITS[category]
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const key = `${category}:${ip}`
  const now = Date.now()

  let entry = rateLimitStore.get(key)
  if (!entry || now > entry.resetAt) {
    entry = { count: 0, resetAt: now + config.windowMs }
    rateLimitStore.set(key, entry)
  }

  entry.count++

  // Set rate limit headers
  const remaining = Math.max(0, config.maxRequests - entry.count)
  event.node.res.setHeader('X-RateLimit-Limit', config.maxRequests.toString())
  event.node.res.setHeader('X-RateLimit-Remaining', remaining.toString())
  event.node.res.setHeader('X-RateLimit-Reset', Math.ceil(entry.resetAt / 1000).toString())

  if (entry.count > config.maxRequests) {
    event.node.res.setHeader('Retry-After', Math.ceil((entry.resetAt - now) / 1000).toString())
    throw createError({
      statusCode: 429,
      message: 'คำขอมากเกินไป กรุณารอสักครู่',
    })
  }
})
