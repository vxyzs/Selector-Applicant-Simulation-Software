import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyAuth } from '@/lib/auth';
import { updateInterviewSchema } from '@/lib/validations/zodSchemas';

export const dynamic = 'force-dynamic';

export async function POST(req) {
    // 1. Rate Limiting: 60 requests per minute per IP
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = await checkRateLimit(`interviews_update_${ip}`, 60, 60000);
    
    if (rateLimit.isRateLimited) {
        return NextResponse.json({ message: 'Too many requests. Please try again later.' }, {
            status: 429,
            headers: { 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) }
        });
    }

    // 2. JWT Verification: Allow expert or hr
    const auth = verifyAuth(req, ['expert', 'hr']);
    if (auth.error) {
        return NextResponse.json({ message: auth.error }, { status: auth.status });
    }

    try {
        const body = await req.json();

        // 3. Schema Validation using Zod
        const result = updateInterviewSchema.safeParse(body);
        if (!result.success) {
            const firstError = result.error.issues[0]?.message || 'Invalid input data';
            return NextResponse.json({ message: firstError }, { status: 400 });
        }

        const { 
            interviewId, 
            questions, 
            totalScore, 
            maxScore, 
            status, 
            HostLink, 
            candidateLink,
            name,
            interviewerIds,
            role,
            scheduledAt,
            meetLink,
            roomId,
            notes,
            verdict
        } = result.data;
        const { db } = await connectToDatabase();

        // 4. Verify ownership: Ensure this expert scheduled this interview, or user is HR
        const targetObjectId = new ObjectId(interviewId);
        const interview = await db.collection("interviews").findOne({ _id: targetObjectId });
        
        if (!interview) {
             return NextResponse.json({ message: "Interview not found" }, { status: 404 });
        }

        const isExpertAllowed = auth.user.role === 'expert' && (
            interview.expertId === auth.user._id ||
            (interview.expertId && interview.expertId.split(',').includes(auth.user._id)) ||
            (interview.interviewerIds && interview.interviewerIds.includes(auth.user._id))
        );

        if (auth.user.role !== 'hr' && !isExpertAllowed) {
             return NextResponse.json({ message: "Forbidden: Cannot update an interview scheduled by another expert" }, { status: 403 });
        }

        // Validate that experts cannot modify final outcome states of the candidate
        if (auth.user.role === 'expert' && status !== undefined && status !== 'completed') {
             return NextResponse.json({ message: "Forbidden: Only HR can set candidate final outcome status (selected, rejected, hold)" }, { status: 403 });
        }

        // 5. Perform the update dynamically
        const updateFields = {};
        
        // If an expert is saving scoring / checklist ratings, save under their private evaluation path
        if (auth.user.role === 'expert' && (questions !== undefined || totalScore !== undefined || maxScore !== undefined)) {
            const expertId = auth.user._id;
            if (questions !== undefined) updateFields[`evaluations.${expertId}.questions`] = questions;
            if (totalScore !== undefined) updateFields[`evaluations.${expertId}.totalScore`] = totalScore;
            if (maxScore !== undefined) updateFields[`evaluations.${expertId}.maxScore`] = maxScore;
            if (notes !== undefined) updateFields[`evaluations.${expertId}.notes`] = notes;
            if (verdict !== undefined) updateFields[`evaluations.${expertId}.verdict`] = verdict;
            
            if (status === 'completed') {
                updateFields[`evaluations.${expertId}.status`] = 'completed';
                updateFields[`evaluations.${expertId}.submittedAt`] = new Date();
            } else {
                updateFields[`evaluations.${expertId}.status`] = interview.evaluations?.[expertId]?.status || 'in_progress';
            }
        } else {
            // General updates or non-scoring outcome selections by HR or lead expert
            if (questions !== undefined) updateFields.questions = questions;
            if (totalScore !== undefined) updateFields.totalScore = totalScore;
            if (maxScore !== undefined) updateFields.maxScore = maxScore;
            if (status !== undefined) updateFields.status = status;
            if (HostLink !== undefined) updateFields.HostLink = HostLink;
            if (candidateLink !== undefined) updateFields.candidateLink = candidateLink;
            if (notes !== undefined) updateFields.notes = notes;
        }

        // HR workflow updates
        if (name !== undefined) updateFields.name = name;
        if (interviewerIds !== undefined) {
            updateFields.interviewerIds = interviewerIds;
            updateFields.expertId = interviewerIds.join(',');
        }
        if (role !== undefined) {
            updateFields.role = role;
            updateFields.jobPosition = role;
        }
        if (scheduledAt !== undefined) {
            updateFields.scheduledAt = scheduledAt;
            updateFields.interviewTime = scheduledAt;
        }
        if (meetLink !== undefined) {
            updateFields.meetLink = meetLink;
            updateFields.HostLink = meetLink || '';
            updateFields.candidateLink = meetLink || '';
        }
        if (roomId !== undefined) updateFields.roomId = roomId;

        await db.collection("interviews").updateOne(
            { _id: targetObjectId },
            {
                $set: updateFields,
            }
        );

        // 6. Post-update panel aggregation: If expert submitted, check if all assigned experts completed
        if (auth.user.role === 'expert' && status === 'completed') {
            const updatedInterview = await db.collection("interviews").findOne({ _id: targetObjectId });
            const assignedIds = updatedInterview.interviewerIds || 
                                (updatedInterview.expertId ? updatedInterview.expertId.split(',') : []);
            
            if (assignedIds.length > 0) {
                const allCompleted = assignedIds.every(id => 
                    updatedInterview.evaluations?.[id]?.status === 'completed'
                );
                if (allCompleted) {
                    await db.collection("interviews").updateOne(
                        { _id: targetObjectId },
                        { $set: { status: 'completed' } }
                    );
                    console.log(`[API Update] Interview ${interviewId} overall status set to 'completed' (all experts submitted)`);
                } else {
                    await db.collection("interviews").updateOne(
                        { _id: targetObjectId },
                        { $set: { status: 'in_progress' } }
                    );
                    console.log(`[API Update] Interview ${interviewId} overall status set to 'in_progress' (waiting for other experts)`);
                }
            }
        }

        return NextResponse.json({ message: "Interview updated successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error updating interview:", error);
        return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
    }
}