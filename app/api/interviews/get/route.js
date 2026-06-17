import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyAuth } from '@/lib/auth';
import { extractResumeText } from '@/services/resume/extractResumeText';

export const dynamic = 'force-dynamic';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;

export async function GET(request) {
    // 1. Rate Limiting: 60 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = await checkRateLimit(`interviews_get_single_${ip}`, 60, 60000);
    
    if (rateLimit.isRateLimited) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {
            status: 429,
            headers: { 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) }
        });
    }

    // 2. JWT Verification: Allow candidate, expert or hr
    const auth = verifyAuth(request, ['candidate', 'expert', 'hr']);
    if (auth.error) {
        return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    try {
        const { searchParams } = new URL(request.url);
        const interviewId = searchParams.get('interviewId');
        console.log('Interview ID: ', interviewId);

        // 3. ID Validation
        if (!interviewId || !objectIdRegex.test(interviewId)) {
            return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
        }

        const { db } = await connectToDatabase();
        const interview = await db.collection('interviews').findOne({ _id: new ObjectId(interviewId) });

        if (!interview) {
            return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
        }

        // Prevent cross-user data leakage: Ensure caller is the candidate, expert or HR for this interview
        const userEmail = auth.user.email ? auth.user.email.toLowerCase() : '';
        const isCandidate = auth.user.role?.toLowerCase() === 'candidate' && interview.email?.toLowerCase() === userEmail;
        const isExpert = auth.user.role?.toLowerCase() === 'expert' && (
            interview.expertId === auth.user._id || 
            (interview.expertId && interview.expertId.split(',').includes(auth.user._id))
        );
        const isHR = auth.user.role?.toLowerCase() === 'hr';

        if (!isCandidate && !isExpert && !isHR) {
             return NextResponse.json({ error: 'Forbidden: You do not have permission to view this interview' }, { status: 403 });
        }

        // Trigger resume text extraction if resume link exists but has not been extracted yet
        if (interview.resumeLink && !interview.extractedText) {
            try {
                console.log('Triggering text extraction for resume URL:', interview.resumeLink);
                const text = await extractResumeText(interview.resumeLink);
                if (text) {
                    await db.collection('interviews').updateOne(
                        { _id: new ObjectId(interviewId) },
                        { $set: { extractedText: text } }
                    );
                    interview.extractedText = text;
                    console.log('Resume text successfully extracted and saved to DB.');
                }
            } catch (err) {
                console.error('Failed to extract resume text on GET interview:', err);
                // Don't crash the request; return the interview data without extractedText
            }
        }

        // 4. Handle role-specific access control and data aggregation
        if (isCandidate) {
            // Candidates MUST NOT see evaluation scores, breakdowns, or ratings
            delete interview.totalScore;
            delete interview.maxScore;
            delete interview.evaluations;
            delete interview.evaluationsBreakdown;
            if (interview.questions && Array.isArray(interview.questions)) {
                interview.questions = interview.questions.map(q => ({
                    key: q.key,
                    question: q.question,
                    rating: 0 // Reset ratings to zero
                }));
            }
        } else {
            // Experts and HR can see evaluations, aggregated breakdowns, and average scores
            const callerId = auth.user._id;
            const isCallerExpert = auth.user.role?.toLowerCase() === 'expert';

            // If an expert is retrieving the interview, load their private evaluation state if it exists
            if (isCallerExpert) {
                if (interview.evaluations && interview.evaluations[callerId]) {
                    interview.questions = interview.evaluations[callerId].questions || interview.questions || [];
                    interview.totalScore = interview.evaluations[callerId].totalScore || 0;
                    interview.maxScore = interview.evaluations[callerId].maxScore || 0;
                    interview.expertStatus = interview.evaluations[callerId].status || 'pending';
                    interview.expertVerdict = interview.evaluations[callerId].verdict || 'select';
                    interview.expertNotes = interview.evaluations[callerId].notes || '';
                } else {
                    interview.expertStatus = 'pending';
                    interview.expertVerdict = 'select';
                    interview.expertNotes = '';
                }
            }

            // Aggregate all evaluations to present a panel breakdown
            let totalCompleted = 0;
            let sumTotalScore = 0;
            let sumMaxScore = 0;
            const evaluationsBreakdown = [];

            if (interview.evaluations) {
                const expertIds = Object.keys(interview.evaluations).map(id => {
                    try { return new ObjectId(id); } catch(e) { return null; }
                }).filter(Boolean);
                
                const experts = await db.collection('users').find({ _id: { $in: expertIds } }).toArray();
                const expertNameMap = experts.reduce((acc, exp) => {
                    acc[exp._id.toString()] = exp.name || exp.email || 'Expert';
                    return acc;
                }, {});

                for (const [expId, evaluation] of Object.entries(interview.evaluations)) {
                    if (evaluation.status === 'completed') {
                        totalCompleted++;
                        sumTotalScore += evaluation.totalScore || 0;
                        sumMaxScore += evaluation.maxScore || 0;
                    }
                    evaluationsBreakdown.push({
                        expertId: expId,
                        expertName: expertNameMap[expId] || 'Expert Coder',
                        status: evaluation.status,
                        totalScore: evaluation.totalScore,
                        maxScore: evaluation.maxScore,
                        verdict: evaluation.verdict || 'none',
                        notes: evaluation.notes,
                        submittedAt: evaluation.submittedAt
                    });
                }
            }

            interview.evaluationsBreakdown = evaluationsBreakdown;
            interview.evaluationsCount = totalCompleted;

            // If at least one evaluation has been submitted, present the average score as the overall candidate score
            if (totalCompleted > 0) {
                interview.totalScore = Math.round(sumTotalScore / totalCompleted);
                interview.maxScore = Math.round(sumMaxScore / totalCompleted);
            }
        }

        return NextResponse.json(interview, { status: 200 });
    } catch (e) {
        console.error('Error fetching interview:', e);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
