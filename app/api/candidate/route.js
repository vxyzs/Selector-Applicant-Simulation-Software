import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import { checkRateLimit } from '@/lib/rateLimit';
import { candidatePatchSchema } from '@/lib/validations/zodSchemas';
import { validateResume } from '@/services/resume/validateResume';
import { uploadResume } from '@/services/resume/uploadResume';
import { deleteResume } from '@/services/resume/deleteResume';

export async function PATCH(request) {
    // 1. Rate Limiting: 60 requests per minute per IP
    const ip = request.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(`candidate_${ip}`, 60, 60000);
    
    if (rateLimit.isRateLimited) {
        return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {
            status: 429,
            headers: { 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) }
        });
    }

    try {
        const data = await request.formData();
        console.log('Candidate patching data:', data);
        
        const file = data.get('resume');
        
        // 2. File validation using validation service
        const validation = validateResume(file);
        if (!validation.valid) {
            return NextResponse.json({ error: validation.error }, { status: 400 });
        }

        // 3. Validate other fields using Zod
        const fields = Object.fromEntries(data.entries());
        const result = candidatePatchSchema.safeParse(fields);
        if (!result.success) {
            const firstError = result.error.issues[0]?.message || 'Invalid input fields';
            return NextResponse.json({ error: firstError }, { status: 400 });
        }

        const { id, skillSets } = result.data;
        const { db } = await connectToDatabase();

        const interview = await db.collection('interviews').findOne({ _id: new ObjectId(id) });
        if (!interview) {
            return NextResponse.json({ error: 'Interview not found' }, { status: 404 });
        }

        // 4. Support replacing old resumes: delete the old resume from Cloudinary if it exists
        if (interview.resumeMetadata && interview.resumeMetadata.public_id) {
            try {
                await deleteResume(interview.resumeMetadata.public_id);
            } catch (err) {
                console.warn('Failed to delete old resume from Cloudinary:', err);
            }
        }

        // 5. Upload new resume to Cloudinary
        const uploadResult = await uploadResume(file);
        const resumeLink = uploadResult.secure_url;

        interview.skillSets = skillSets || '';
        interview.resumeLink = resumeLink;

        await db.collection('interviews').updateOne(
            { _id: new ObjectId(id) },
            { 
                $set: { 
                    skillSets: interview.skillSets, 
                    resumeLink,
                    resumeMetadata: uploadResult,
                    extractedText: ''
                } 
            }
        );

        console.log('Interview updated successfully with Cloudinary:', interview);
        return NextResponse.json({ message: 'Submission successful', resumeLink, interview }, { status: 200 });
    } catch (e) {
        console.error('Candidate patching API error:', e);
        return NextResponse.json(
            { error: e.message || 'Internal Server Error' },
            { status: 500 }
        );
    }
}
