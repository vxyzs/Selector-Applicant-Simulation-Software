import { NextResponse } from 'next/server';
import { render } from '@react-email/render';
import { sendEmail } from '@/lib/mailer';
import { verifyAuth } from '@/lib/auth';
import { checkRateLimit } from '@/lib/rateLimit';
import InterviewInvite from '@/components/InterviewInvite';

export const dynamic = 'force-dynamic';

export async function POST(req) {
  // 1. Rate Limiting: 60 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = await checkRateLimit(`send_email_${ip}`, 60, 60000);
  
  if (rateLimit.isRateLimited) {
    return NextResponse.json(
      { message: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) }
      }
    );
  }

  // 2. JWT Verification: Only HR allowed
  const auth = verifyAuth(req, ['hr']);
  if (auth.error) {
    return NextResponse.json({ message: auth.error }, { status: auth.status });
  }

  try {
    const body = await req.json();
    const { name, email, jobPosition, InterviewLink } = body;

    if (!name || !email || !jobPosition || !InterviewLink) {
      return NextResponse.json(
        { message: 'Missing required fields: name, email, jobPosition, and InterviewLink are required.' },
        { status: 400 }
      );
    }

    // Render the React Email template to an HTML string
    const html = await render(
      <InterviewInvite
        candidateName={name}
        interviewLink={InterviewLink}
        role={jobPosition}
      />
    );

    // Send email using SMTP Nodemailer
    const { data, error } = await sendEmail({
      to: email,
      subject: `Interview Invitation for ${jobPosition}`,
      html,
    });

    if (error) {
      console.error('SMTP Send Error:', error);
      return NextResponse.json(
        { message: error.message || 'Failed to send email via SMTP' },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { message: 'Email sent successfully', data },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error in send-email API route:', error);
    return NextResponse.json(
      { message: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
