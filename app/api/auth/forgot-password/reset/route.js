import { connectToDatabase } from '@/lib/mongodb';
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email, otp, newPassword } = await req.json();

    if (!email || !otp || !newPassword) {
      return NextResponse.json(
        { message: 'Email, OTP, and new password are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { message: 'New password must be at least 6 characters long' },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { db } = await connectToDatabase();

    // 1. Fetch OTP record
    const resetRecord = await db.collection('password_resets').findOne({ email: normalizedEmail });
    if (!resetRecord) {
      return NextResponse.json(
        { message: 'No password reset request found. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // 2. Check if expired
    if (new Date() > new Date(resetRecord.expiresAt)) {
      await db.collection('password_resets').deleteOne({ email: normalizedEmail });
      return NextResponse.json(
        { message: 'OTP has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // 3. Prevent Brute-Force: Check attempts
    if (resetRecord.attempts >= 5) {
      await db.collection('password_resets').deleteOne({ email: normalizedEmail });
      return NextResponse.json(
        { message: 'Too many incorrect attempts. Please request a new OTP.' },
        { status: 400 }
      );
    }

    // 4. Increment attempt count immediately to mitigate race conditions
    await db.collection('password_resets').updateOne(
      { email: normalizedEmail },
      { $inc: { attempts: 1 } }
    );

    // 5. Compare the submitted OTP hash with the stored hash
    const submittedHashedOtp = crypto.createHash('sha256').update(otp.trim()).digest('hex');

    if (submittedHashedOtp !== resetRecord.hashedOtp) {
      const remainingAttempts = 5 - (resetRecord.attempts + 1);
      return NextResponse.json(
        { message: `Invalid OTP code. You have ${remainingAttempts} attempts remaining.` },
        { status: 400 }
      );
    }

    // 6. OTP is valid! Update user password
    const user = await db.collection('users').findOne({ email: normalizedEmail });
    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await db.collection('users').updateOne(
      { email: normalizedEmail },
      { $set: { password: hashedPassword } }
    );

    // 7. Clean up the OTP record
    await db.collection('password_resets').deleteOne({ email: normalizedEmail });

    return NextResponse.json(
      { message: 'Password reset successful! You can now log in with your new password.' },
      { status: 200 }
    );

  } catch (error) {
    console.error('Error in forgot-password reset API route:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
