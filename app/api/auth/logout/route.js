import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';
import jwt from 'jsonwebtoken';
import { config } from '@/lib/config';

let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (e) {
    console.error('Failed to initialize Redis client in logout API:', e);
  }
}

export async function POST(req) {
  const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ message: 'Missing token' }, { status: 400 });
  }

  const token = authHeader.split(' ')[1];
  if (!token) {
    return NextResponse.json({ message: 'Invalid token format' }, { status: 400 });
  }

  try {
    // Decode the token to get its remaining validity (expiry)
    const decoded = jwt.verify(token, config.jwtSecret);
    
    if (redis && decoded && decoded.exp) {
      const now = Math.floor(Date.now() / 1000);
      const remainingSeconds = decoded.exp - now;
      
      if (remainingSeconds > 0) {
        // Blacklist the token in Redis with a TTL matching its remaining lifetime
        await redis.set(`blacklist:${token}`, 'true', { ex: remainingSeconds });
        console.log(`[Logout API] Token blacklisted successfully. Remaining TTL: ${remainingSeconds}s`);
      }
    }
  } catch (err) {
    console.warn('[Logout API] Token verification failed on logout, blacklisting with default TTL (15 days):', err.message);
    if (redis) {
      try {
        // Fallback: Blacklist with default TTL (15 days = 1296000 seconds)
        await redis.set(`blacklist:${token}`, 'true', { ex: 1296000 });
      } catch (cacheErr) {
        console.error('[Logout API] Redis cache write failed:', cacheErr);
      }
    }
  }

  return NextResponse.json({ message: 'Logged out successfully' }, { status: 200 });
}
