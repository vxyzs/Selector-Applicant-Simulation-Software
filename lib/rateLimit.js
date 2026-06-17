import { Redis } from '@upstash/redis';
import { Ratelimit } from '@upstash/ratelimit';

let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (e) {
    console.error('Failed to initialize Upstash Redis client:', e);
  }
}

// In-memory cache for Upstash Ratelimit instances
const ratelimitInstances = new Map();

function getRatelimitInstance(limit, windowMs) {
  const cacheKey = `${limit}_${windowMs}`;
  if (ratelimitInstances.has(cacheKey)) {
    return ratelimitInstances.get(cacheKey);
  }
  const instance = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(limit, `${windowMs} ms`),
    prefix: '@nexus/ratelimit',
  });
  ratelimitInstances.set(cacheKey, instance);
  return instance;
}

// Fallback in-memory rate limiter
const localRateLimitMap = new Map();

// Periodic cleanup for local map
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of localRateLimitMap.entries()) {
      if (now > value.resetTime) {
        localRateLimitMap.delete(key);
      }
    }
  }, 300000);
}

function checkLocalRateLimit(ip, limit, windowMs) {
  const now = Date.now();
  const entry = localRateLimitMap.get(ip) || { count: 0, resetTime: now + windowMs };

  if (now > entry.resetTime) {
    entry.count = 1;
    entry.resetTime = now + windowMs;
  } else {
    entry.count++;
  }

  localRateLimitMap.set(ip, entry);

  const remaining = Math.max(0, limit - entry.count);
  const isRateLimited = entry.count > limit;

  return {
    isRateLimited,
    limit,
    remaining,
    resetTime: entry.resetTime
  };
}

export async function checkRateLimit(ip, limit = 60, windowMs = 60000) {
  if (redis) {
    try {
      const ratelimit = getRatelimitInstance(limit, windowMs);
      const { success, limit: limitReturned, reset, remaining } = await ratelimit.limit(ip);
      return {
        isRateLimited: !success,
        limit: limitReturned,
        remaining,
        resetTime: reset
      };
    } catch (err) {
      console.warn('[Rate Limit] Redis error, falling back to in-memory rate limiting:', err);
      return checkLocalRateLimit(ip, limit, windowMs);
    }
  }
  return checkLocalRateLimit(ip, limit, windowMs);
}

