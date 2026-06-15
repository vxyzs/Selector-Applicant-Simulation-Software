import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyAuth } from '@/lib/auth';
import { generateQuestionsSchema } from '@/lib/validations/zodSchemas';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { extractResumeText } from '@/services/resume/extractResumeText';
import { generateQuestions } from '@/services/ai/generateQuestions';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  // 1. Rate Limiting: 60 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`genquestions_${ip}`, 60, 60000);
  
  if (rateLimit.isRateLimited) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) }
      }
    );
  }

  // 2. JWT Verification: Allow candidate, expert or hr
  const auth = verifyAuth(req, ['candidate', 'expert', 'hr']);
  if (auth.error) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const data = await req.json();
    console.log('[API generateQuestions] Received payload:', data);

    // 3. Schema Validation using Zod
    const result = generateQuestionsSchema.safeParse(data);
    if (!result.success) {
      const firstError = result.error.issues[0]?.message || 'Invalid input params';
      return NextResponse.json({ error: firstError }, { status: 400 });
    }

    let { 
      interviewId, 
      resumeText, 
      jobRole, 
      experienceLevel, 
      expertSpecialization, 
      targetLevel, 
      focusAreas, 
      customPrompt, 
      questionCount 
    } = result.data;

    // 4. Resolve parameters via DB if interviewId is provided
    if (interviewId && ObjectId.isValid(interviewId)) {
      const { db } = await connectToDatabase();
      const interview = await db.collection('interviews').findOne({ _id: new ObjectId(interviewId) });

      if (interview) {
        // Fallback fields from interview details if not explicitly passed
        if (!jobRole) {
          jobRole = interview.jobPosition || interview.role || '';
        }

        if (!resumeText) {
          // If not extracted, extract it on-the-fly
          if (interview.resumeLink && !interview.extractedText) {
            try {
              console.log('[API generateQuestions] Resume text not yet extracted. Triggering extraction...');
              const text = await extractResumeText(interview.resumeLink);
              if (text) {
                await db.collection('interviews').updateOne(
                  { _id: interview._id },
                  { $set: { extractedText: text } }
                );
                resumeText = text;
              }
            } catch (err) {
              console.error('[API generateQuestions] Resume extraction failed, proceeding with empty resume text:', err);
            }
          } else {
            resumeText = interview.extractedText || '';
          }
        }

        // Attempt to load the expert's specialization
        if (!expertSpecialization) {
          let expertId = null;
          if (interview.interviewerIds && interview.interviewerIds.length > 0) {
            expertId = interview.interviewerIds[0];
          } else {
            expertId = interview.expertId;
          }

          if (expertId && ObjectId.isValid(expertId)) {
            const expert = await db.collection('users').findOne({ _id: new ObjectId(expertId) });
            if (expert) {
              expertSpecialization = expert.specialization || expert.department || '';
            }
          }
        }
      }
    }

    // Default fallbacks if fields are still empty
    jobRole = jobRole || 'Software Engineer';
    experienceLevel = experienceLevel || 'Mid-Level';
    expertSpecialization = expertSpecialization || 'General Engineering';
    resumeText = resumeText || '';
    targetLevel = targetLevel || 'mid';
    focusAreas = focusAreas || jobRole; // Focus area should be job role initially

    console.log('[API generateQuestions] Triggering AI questions generation with:', {
      jobRole,
      experienceLevel,
      targetLevel,
      expertSpecialization,
      focusAreas,
      questionCount,
      hasResume: !!resumeText,
      hasCustomPrompt: !!customPrompt
    });

    const questions = await generateQuestions({
      resumeText,
      jobRole,
      experienceLevel,
      expertSpecialization,
      targetLevel,
      focusAreas,
      customPrompt,
      questionCount
    });


    return NextResponse.json({ questions }, { status: 200 });

  } catch (error) {
    console.error('[API generateQuestions] Internal Server Error:', error);
    return NextResponse.json(
      { error: 'Failed to generate questions. Internal server error.' },
      { status: 500 }
    );
  }
}
