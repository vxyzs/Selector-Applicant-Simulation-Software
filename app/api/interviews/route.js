import { connectToDatabase } from '@/lib/mongodb';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyAuth } from '@/lib/auth';
import { createInterviewSchema } from '@/lib/validations/zodSchemas';
import { ObjectId } from 'mongodb';
import { render } from '@react-email/render';
import { sendEmail } from '@/lib/mailer';
import InterviewInvite from '@/components/interviewInvite';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  // 1. Rate Limiting: 60 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`interviews_post_${ip}`, 60, 60000);
  
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
    const result = createInterviewSchema.safeParse(body);
    if (!result.success) {
      const firstError = result.error.issues[0]?.message || 'Invalid input data';
      return new Response(JSON.stringify({ message: firstError }), { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
      });
    }

    const {
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
      notes
    } = result.data;

    // HR can schedule interviews for any expert, so no expert ID spoofing check is needed here.

    const { db } = await connectToDatabase();

    const insertResult = await db.collection('interviews').insertOne({
      name: name || '',
      email: email ? email.toLowerCase() : '',
      jobPosition: jobPosition || role || '',
      interviewTime: interviewTime || scheduledAt || '',
      HostLink: HostLink || '',
      candidateLink: candidateLink || '',
      interviewLink: interviewLink || '',
      skillSets: skillSets || '',
      resumeLink: resumeLink || '',
      expertId: expertId || (interviewerIds && interviewerIds.length > 0 ? interviewerIds.join(',') : ''),
      hrId: hrId || auth.user._id,
      candidateId: candidateId || null,
      interviewerIds: interviewerIds || [],
      role: role || jobPosition || '',
      scheduledAt: scheduledAt || interviewTime || '',
      status: status || 'scheduled',
      meetLink: meetLink !== undefined ? meetLink : null,
      roomId: roomId !== undefined ? roomId : null,
      notes: notes || '',
      createdAt: new Date(),
    });

    const newInterview = await db.collection('interviews').findOne({ _id: insertResult.insertedId });

    // Send the interview invitation email
    if (newInterview && newInterview.email) {
      try {
        const origin = req.headers.get('origin') || 'http://localhost:3000';
        const actualInterviewLink = newInterview.interviewLink || `${origin}/can?id=${newInterview._id}`;
        
        const html = await render(
          <InterviewInvite
            candidateName={newInterview.name}
            interviewLink={actualInterviewLink}
            role={newInterview.jobPosition}
          />
        );

        const { error: emailErr } = await sendEmail({
          to: newInterview.email,
          subject: `Interview Invitation for ${newInterview.jobPosition}`,
          html
        });

        if (emailErr) {
          console.error('[API Interviews] Failed to send candidate invitation email via SMTP:', emailErr);
        }
      } catch (emailErr) {
        console.error('[API Interviews] Error rendering or sending candidate invitation email:', emailErr);
      }
    }

    return new Response(
      JSON.stringify({ message: 'Interview created successfully', interview: newInterview }), 
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating interview:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function GET(req) {
  // 1. Rate Limiting: 60 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`interviews_get_${ip}`, 60, 60000);
  
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
    const url = new URL(req.url);
    const expertId = url.searchParams.get('userid');

    if (!expertId && auth.user.role !== 'hr') {
      return new Response(JSON.stringify({ message: 'userid is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Prevent ID spoofing: Enforce expert ownership check, but allow HR to access any expert's interviews
    if (auth.user.role === 'expert' && auth.user._id !== expertId) {
      return new Response(JSON.stringify({ message: 'Forbidden: Cannot access interviews of another expert account' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();
    
    let filter = {};

    if (auth.user.role === 'hr') {
      const callerUser = await db.collection('users').findOne({ _id: new ObjectId(auth.user._id) });
      if (callerUser && callerUser.organization) {
        // Find all users from the same organization (both experts and HR coordinators)
        const orgUsers = await db.collection('users').find({
          organization: { $regex: new RegExp(`^${callerUser.organization.trim()}$`, 'i') }
        }, { projection: { _id: 1 } }).toArray();

        const orgIdsList = orgUsers.map(u => u._id.toString());
        orgUsers.forEach(u => orgIdsList.push(u._id));

        const orgIdsStrList = orgIdsList.map(id => String(id));

        const orgMatchFilter = {
          $or: [
            { hrId: { $in: orgIdsList } },
            { interviewerIds: { $in: orgIdsStrList } }
          ]
        };

        if (expertId) {
          filter = {
            $and: [
              orgMatchFilter,
              {
                $or: [
                  { expertId: expertId },
                  { expertId: { $regex: expertId } }
                ]
              }
            ]
          };
        } else {
          filter = orgMatchFilter;
        }
      } else {
        filter = { hrId: null };
      }
    } else {
      // Expert caller
      if (expertId) {
        filter = {
          $or: [
            { expertId: expertId },
            { expertId: { $regex: expertId } }
          ]
        };
      } else {
        filter = {
          $or: [
            { expertId: auth.user._id },
            { expertId: { $regex: auth.user._id } }
          ]
        };
      }
    }

    const users = await db.collection('interviews').find(filter).toArray();

    return new Response(
      JSON.stringify({ message: 'Users fetched successfully', users }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching users:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}