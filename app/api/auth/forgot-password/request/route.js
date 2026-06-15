import { connectToDatabase } from '@/lib/mongodb';
import { sendEmail } from '@/lib/mailer';
import crypto from 'crypto';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const { email } = await req.json();

    if (!email || !email.trim()) {
      return NextResponse.json({ message: 'Email address is required' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const { db } = await connectToDatabase();

    // 1. Verify user exists in the database
    const user = await db.collection('users').findOne({ email: normalizedEmail });
    if (!user) {
      // Return generic success to prevent email enumeration/discovery attacks
      return NextResponse.json({ 
        message: 'If the email is registered in our system, an OTP has been sent successfully.' 
      }, { status: 200 });
    }

    // 2. Enforce a resend rate limit (minimum 60-second cooldown)
    const recentReset = await db.collection('password_resets').findOne({ email: normalizedEmail });
    if (recentReset && (Date.now() - recentReset.createdAt.getTime() < 60000)) {
      return NextResponse.json({ 
        message: 'Please wait at least 60 seconds before requesting a new OTP.' 
      }, { status: 429 });
    }

    // 3. Generate a 6-digit cryptographically secure numeric OTP
    const otp = crypto.randomInt(100000, 1000000).toString();

    // 4. Securely hash the OTP using SHA-256 before storing it in the database
    const hashedOtp = crypto.createHash('sha256').update(otp).digest('hex');

    // 5. Store OTP record in `password_resets` collection with expiration (10 minutes)
    const expiresAt = new Date(Date.now() + 10 * 60000);
    await db.collection('password_resets').updateOne(
      { email: normalizedEmail },
      { 
        $set: {
          hashedOtp,
          expiresAt,
          attempts: 0,
          createdAt: new Date()
        } 
      },
      { upsert: true }
    );

    // Create TTL Index on the expiresAt field so MongoDB cleans up expired OTPs automatically
    try {
      await db.collection('password_resets').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 });
    } catch (indexErr) {
      // index might already exist
    }

    // 6. Send the OTP email to the user
    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Reset your Nexus Password</title>
        </head>
        <body style="font-family: 'Inter', Arial, sans-serif; background-color: #f3f4f6; padding: 24px; color: #1f2937;">
          <div style="max-width: 500px; margin: 0 auto; background-color: #ffffff; padding: 32px; border-radius: 16px; border: 1px solid #e5e7eb; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
            <h2 style="color: #4f46e5; margin-top: 0; font-size: 22px;">Nexus Password Reset Request</h2>
            <p style="font-size: 15px; line-height: 1.5; color: #4b5563;">
              We received a request to reset your password. Use the following One-Time Password (OTP) to complete the verification process:
            </p>
            <div style="background-color: #f9fafb; border: 2px dashed #4f46e5; padding: 16px; border-radius: 12px; text-align: center; margin: 24px 0;">
              <span style="font-size: 32px; font-weight: 800; letter-spacing: 6px; color: #4f46e5; font-family: monospace;">${otp}</span>
            </div>
            <p style="font-size: 14px; color: #ef4444; font-weight: 600;">
              ⚠️ This OTP code is only valid for 10 minutes and can be verified up to 5 times. Do not share this code with anyone.
            </p>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
            <p style="font-size: 12px; color: #9ca3af; margin-bottom: 0;">If you did not request a password reset, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
    `;

    const { error: emailErr } = await sendEmail({
      to: normalizedEmail,
      subject: 'Nexus Password Reset OTP Verification',
      html: emailHtml
    });

    if (emailErr) {
      console.error('[Forgot Password] Failed to send OTP email:', emailErr);
      return NextResponse.json({ message: 'Failed to send OTP email. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: 'If the email is registered in our system, an OTP has been sent successfully.' 
    }, { status: 200 });

  } catch (error) {
    console.error('Error requesting forgot password OTP:', error);
    return NextResponse.json({ message: 'Internal Server Error' }, { status: 500 });
  }
}
