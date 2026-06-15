import { checkRateLimit } from '@/lib/rateLimit';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  // 1. Rate Limiting: 60 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`check_hr_${ip}`, 60, 60000);
  
  if (rateLimit.isRateLimited) {
    return new Response(JSON.stringify({ isHR: false, message: 'Too many requests' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(req.url);
    const email = url.searchParams.get('email');
    if (!email) {
      return new Response(JSON.stringify({ isHR: false }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const allowedEmailsStr = process.env.ALLOWED_HR_EMAILS || '';
    const allowedEmails = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
    const isHR = allowedEmails.includes(email.trim().toLowerCase());

    return new Response(JSON.stringify({ isHR }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error checking HR email:', error);
    return new Response(JSON.stringify({ isHR: false, message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
