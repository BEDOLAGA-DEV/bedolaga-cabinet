/**
 * Client-side rate limiting utilities to prevent spam requests
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Check if action is rate limited
 * @param key Unique key for the action (e.g., 'payment', 'ticket-create')
 * @param maxRequests Maximum requests allowed in the time window
 * @param windowMs Time window in milliseconds
 * @returns true if action is allowed, false if rate limited
 */
export function checkRateLimit(
  key: string,
  maxRequests: number = 3,
  windowMs: number = 10000
): boolean {
  const now = Date.now()
  const entry = rateLimitStore.get(key)

  // Clean up expired entry
  if (entry && now >= entry.resetTime) {
    rateLimitStore.delete(key)
  }

  const currentEntry = rateLimitStore.get(key)

  if (!currentEntry) {
    // First request - allow and start tracking
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + windowMs,
    })
    return true
  }

  if (currentEntry.count >= maxRequests) {
    // Rate limit exceeded
    return false
  }

  // Increment counter and allow
  currentEntry.count++
  return true
}

/**
 * Get remaining time until rate limit resets (in seconds)
 */
export function getRateLimitResetTime(key: string): number {
  const entry = rateLimitStore.get(key)
  if (!entry) return 0
  const remaining = entry.resetTime - Date.now()
  return remaining > 0 ? Math.ceil(remaining / 1000) : 0
}

/**
 * Reset rate limit for a key (e.g., after successful action)
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key)
}

/**
 * Debounce function - delays execution until after wait ms have elapsed
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  return (...args: Parameters<T>) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, wait)
  }
}

/**
 * Throttle function - ensures function is called at most once per limit ms
 */
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false

  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args)
      inThrottle = true
      setTimeout(() => {
        inThrottle = false
      }, limit)
    }
  }
}

// Rate limit keys for different actions
export const RATE_LIMIT_KEYS = {
  PAYMENT: 'payment',
  TICKET_CREATE: 'ticket-create',
  TICKET_REPLY: 'ticket-reply',
  PROMO_ACTIVATE: 'promo-activate',
  WHEEL_SPIN: 'wheel-spin',
} as const
