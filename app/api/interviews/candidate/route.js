import { connectToDatabase } from '@/lib/mongodb';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  // 1. Rate Limiting: 60 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = await checkRateLimit(`candidate_interviews_${ip}`, 60, 60000);
  
  if (rateLimit.isRateLimited) {
      return new Response(JSON.stringify({ message: 'Too many requests. Please try again later.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) }
      });
  }

  // 2. JWT Verification: Only Candidate allowed
  const auth = verifyAuth(req, ['candidate']);
  if (auth.error) {
      return new Response(JSON.stringify({ message: auth.error }), { 
          status: auth.status,
          headers: { 'Content-Type': 'application/json' }
      });
  }

  try {
    const userEmail = auth.user.email ? auth.user.email.toLowerCase() : '';
    
    if (!userEmail) {
      return new Response(JSON.stringify({ message: 'User email not found in token' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();
    
    // Find all interviews where candidate email matches
    const allInterviews = await db.collection('interviews').find({ email: userEmail }).toArray();

    // Gather all unique expert IDs from both interviewerIds array and expertId string
    const allExpertIds = new Set();
    allInterviews.forEach(interview => {
      if (interview.interviewerIds && Array.isArray(interview.interviewerIds)) {
        interview.interviewerIds.forEach(id => allExpertIds.add(id));
      }
      if (interview.expertId) {
        interview.expertId.split(',').forEach(id => {
          const trimmed = id.trim();
          if (trimmed) allExpertIds.add(trimmed);
        });
      }
    });

    const experts = await db.collection('users').find({
      _id: { 
        $in: Array.from(allExpertIds).map(id => {
          try { return new ObjectId(id); } catch(e) { return null; }
        }).filter(Boolean) 
      }
    }, { projection: { password: 0 } }).toArray();

    // Map expertId -> expert details
    const expertMap = {};
    experts.forEach(expert => {
      expertMap[expert._id.toString()] = {
        id: expert._id.toString(),
        name: expert.name || 'Unknown Expert',
        email: expert.email || '',
        organization: expert.organization || 'N/A'
      };
    });

    const past = [];
    const future = [];

    for (const interview of allInterviews) {
      const interviewers = [];
      if (interview.interviewerIds && Array.isArray(interview.interviewerIds)) {
        interview.interviewerIds.forEach(id => {
          if (expertMap[id]) interviewers.push(expertMap[id]);
        });
      } else if (interview.expertId) {
        interview.expertId.split(',').forEach(id => {
          const trimmed = id.trim();
          if (expertMap[trimmed]) interviewers.push(expertMap[trimmed]);
        });
      }

      const firstExpertId = interview.expertId ? interview.expertId.split(',')[0]?.trim() : '';
      const org = expertMap[firstExpertId]?.organization || 'N/A';

      const interviewWithDetails = { 
        ...interview, 
        interviewers, 
        organization: org 
      };

      const isPast = ['completed', 'cancelled', 'rejected', 'selected'].includes(interview.status);
      if (isPast) {
        past.push(interviewWithDetails);
      } else {
        future.push(interviewWithDetails);
      }
    }

    return new Response(
      JSON.stringify({
        message: 'Candidate interviews fetched successfully',
        past,
        future,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching candidate interviews:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
