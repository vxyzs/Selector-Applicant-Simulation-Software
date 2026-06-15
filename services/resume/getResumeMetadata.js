import { connectToDatabase } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

/**
 * Retrieves resume metadata for a specific interview.
 * @param {string} interviewId - The database ID of the interview.
 * @returns {Promise<any>}
 */
export async function getResumeMetadata(interviewId) {
  if (!interviewId) return null;
  try {
    const { db } = await connectToDatabase();
    const interview = await db.collection('interviews').findOne({ _id: new ObjectId(interviewId) });
    return interview ? (interview.resumeMetadata || null) : null;
  } catch (error) {
    console.error('Error fetching resume metadata:', error);
    return null;
  }
}
