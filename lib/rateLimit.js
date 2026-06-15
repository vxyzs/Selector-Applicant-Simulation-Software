// lib/rateLimit.js

const rateLimitMap = new Map();

// Cleans up expired entries periodically to prevent memory leaks
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
}, 300000); // every 5 minutes

export function checkRateLimit(ip, limit = 60, windowMs = 60000) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + windowMs;
  } else {
    entry.count++;
  }

  rateLimitMap.set(ip, entry);

  const remaining = Math.max(0, limit - entry.count);
  const isRateLimited = entry.count > limit;

  return {
    isRateLimited,
    limit,
    remaining,
    resetTime: entry.resetTime
  };
}
