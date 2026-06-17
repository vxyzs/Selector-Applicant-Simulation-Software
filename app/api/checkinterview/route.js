import { connectToDatabase } from '@/lib/mongodb';
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { checkRateLimit } from '@/lib/rateLimit';
import { checkInterviewSchema } from '@/lib/validations/zodSchemas';

export async function POST(req) {
    // 1. Rate Limiting: 60 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = await checkRateLimit(`checkinterview_${ip}`, 60, 60000);
    
    if (rateLimit.isRateLimited) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {
            status: 429,
            headers: { 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) }
        });
    }

    try {
        const body = await req.json();

        // 2. Schema Validation using Zod
        const result = checkInterviewSchema.safeParse(body);
        if (!result.success) {
            const firstError = result.error.issues[0]?.message || 'Invalid input fields';
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { interviewID, userEmail } = result.data;
        const { db } = await connectToDatabase();

        // Safe NoSQL injection checks
        if (!ObjectId.isValid(interviewID)) {
             return NextResponse.json({ error: 'Invalid ID format' }, { status: 400 });
        }
        const interviewObjectId = new ObjectId(interviewID);

        const interview = await db.collection('interviews').findOne({ _id: interviewObjectId });

        if (!interview) {
            return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
        }

        if (interview.email !== userEmail) {
            return NextResponse.json({ error: 'You are not the candidate for this interview' }, { status: 403 });
        }

        return NextResponse.json({ message: 'Interview ID and user validated', interview }, { status: 200 });
    } catch (error) {
        console.error('Error validating interview ID or user:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
