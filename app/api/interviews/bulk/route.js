import { connectToDatabase } from '@/lib/mongodb';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyAuth } from '@/lib/auth';
import { createInterviewSchema } from '@/lib/validations/zodSchemas';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// Validation schema for bulk payload: expects an array of interviews
const bulkUploadSchema = z.object({
  interviews: z.array(createInterviewSchema)
});

export async function POST(req) {
  // 1. Rate Limiting: 60 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = await checkRateLimit(`interviews_bulk_post_${ip}`, 60, 60000);
  
  if (rateLimit.isRateLimited) {
      return new Response(JSON.stringify({ message: 'Too many requests. Please try again later.' }), {
          status: 429,
          headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) }
      });
  }

  // 2. JWT Verification: Only HR allowed
  const auth = verifyAuth(req, ['hr']);
  if (auth.error) {
      return new Response(JSON.stringify({ message: auth.error }), { 
          status: auth.status,
          headers: { 'Content-Type': 'application/json' }
      });
  }

  try {
    const body = await req.json();

    // 3. Schema Validation using Zod
    const result = bulkUploadSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0]?.message || 'Invalid input data';
      return new Response(JSON.stringify({ message: firstError }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
      });
    }

    const { interviews } = result.data;

    if (!interviews || interviews.length === 0) {
      return new Response(JSON.stringify({ message: 'No interviews provided' }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    // Prepare records for insertion
    const documentsToInsert = interviews.map((interview) => {
      const name = interview.name || '';
      const email = interview.email ? interview.email.toLowerCase() : '';
      const jobPosition = interview.jobPosition || interview.role || '';
      const interviewTime = interview.interviewTime || interview.scheduledAt || '';
      const HostLink = interview.HostLink || '';
      const candidateLink = interview.candidateLink || '';
      const interviewLink = interview.interviewLink || '';
      const skillSets = interview.skillSets || '';
      const resumeLink = interview.resumeLink || '';
      const interviewerIds = interview.interviewerIds || [];
      const expertId = interview.expertId || (interviewerIds.length > 0 ? interviewerIds.join(',') : '');
      const hrId = interview.hrId || auth.user._id;
      const candidateId = interview.candidateId || null;
      const role = interview.role || jobPosition || '';
      const scheduledAt = interviewTime;
      const status = interview.status || 'scheduled';
      const meetLink = interview.meetLink !== undefined ? interview.meetLink : null;
      const roomId = interview.roomId !== undefined ? interview.roomId : null;
      const notes = interview.notes || '';

      return {
        name,
        email,
        jobPosition,
        interviewTime,
        HostLink,
        candidateLink,
        interviewLink,
        skillSets,
        resumeLink,
        expertId,
        hrId,
        candidateId,
        interviewerIds,
        role,
        scheduledAt,
        status,
        meetLink,
        roomId,
        notes,
        createdAt: new Date()
      };
    });

    // Bulk insert documents into the interviews collection
    const insertResult = await db.collection('interviews').insertMany(documentsToInsert);

    return new Response(
      JSON.stringify({ 
        message: `${insertResult.insertedCount} interviews uploaded successfully`, 
        insertedCount: insertResult.insertedCount 
      }), 
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error bulk creating interviews:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}
