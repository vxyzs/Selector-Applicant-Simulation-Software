import { connectToDatabase } from '@/lib/mongodb';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  // 1. Rate Limiting: 60 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = await checkRateLimit(`interviews_future_${ip}`, 60, 60000);
  
  if (rateLimit.isRateLimited) {
      return new Response(JSON.stringify({ message: 'Too many requests. Please try again later.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) }
      });
  }

  // 2. JWT Verification: Allow expert or hr
  const auth = verifyAuth(req, ['expert', 'hr']);
  if (auth.error) {
      return new Response(JSON.stringify({ message: auth.error }), { 
          status: auth.status,
          headers: { 'Content-Type': 'application/json' }
      });
  }

  try {
    const currentUserId = req.headers.get('userid');
    console.log('Current User ID header:', currentUserId);
    
    if (!currentUserId) {
      return new Response(JSON.stringify({ message: 'User ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    // Prevent ID spoofing: Enforce expert ownership check
    if (auth.user.role === 'expert' && auth.user._id !== currentUserId) {
      return new Response(JSON.stringify({ message: 'Forbidden: Identity mismatch' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent cross-organization access for HR
    if (auth.user.role === 'hr') {
      const hrUser = await db.collection('users').findOne({ _id: new ObjectId(auth.user._id) });
      const targetUser = await db.collection('users').findOne({ _id: new ObjectId(currentUserId) });
      if (!hrUser || !targetUser || !hrUser.organization || !targetUser.organization || 
          hrUser.organization.toLowerCase() !== targetUser.organization.toLowerCase()) {
        return new Response(JSON.stringify({ message: 'Forbidden: Cross-organization access denied' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
    const filter = {
      status: { $in: ['pending', 'scheduled', 'room_generated', 'in_progress'] },
      $or: [
        { expertId: currentUserId },
        { expertId: { $regex: currentUserId } }
      ]
    };
    const candidates = await db.collection('interviews').find(filter).toArray();

    return new Response(
      JSON.stringify({
        message: 'Future interviews fetched successfully',
        candidates,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching future interviews:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
