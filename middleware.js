import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

let redis = null;
if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  } catch (e) {
    console.error('Failed to initialize Redis client in global middleware:', e);
  }
}

export async function middleware(req) {
  const path = req.nextUrl.pathname;

  // Enforce check on all API routes except login, signup, check-hr, forgot-password, and checkinterview
  if (
    path.startsWith('/api') &&
    !path.startsWith('/api/auth/login') &&
    !path.startsWith('/api/auth/signup') &&
    !path.startsWith('/api/auth/check-hr') &&
    !path.startsWith('/api/auth/forgot-password') &&
    !path.startsWith('/api/checkinterview')
  ) {
    const authHeader = req.headers.get('Authorization') || req.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      if (token && redis) {
        try {
          const isBlacklisted = await redis.get(`blacklist:${token}`);
          if (isBlacklisted) {
            return new NextResponse(
              JSON.stringify({ message: 'Unauthorized: Token has been revoked or logged out.' }),
              {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              }
            );
          }
        } catch (err) {
          console.warn('[Middleware] Redis blacklist lookup failed, bypassing check:', err);
        }
      }
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
