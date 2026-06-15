import { connectToDatabase } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { render } from '@react-email/render';
import { sendEmail } from '@/lib/mailer';
import OnboardingEmail from '@/components/onboardingEmail';
import { checkRateLimit } from '@/lib/rateLimit';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

// GET: Fetch HR members (HR filters by organization, Admin can fetch all or filter by organization)
export async function GET(req) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`hr_get_${ip}`, 60, 60000);
  
  if (rateLimit.isRateLimited) {
    return new Response(JSON.stringify({ message: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const auth = verifyAuth(req, ['hr', 'admin']);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { db } = await connectToDatabase();
    let filter = { role: { $regex: /^hr$/i } };
    let leadRecruiterEmail = '';

    if (auth.user.role.toLowerCase() === 'admin') {
      const orgParam = new URL(req.url).searchParams.get('organization');
      if (orgParam) {
        filter.organization = { $regex: new RegExp(`^${orgParam.trim()}$`, 'i') };
        const orgDoc = await db.collection('organizations').findOne({
          name: { $regex: new RegExp(`^${orgParam.trim()}$`, 'i') }
        });
        if (orgDoc) {
          leadRecruiterEmail = orgDoc.leadRecruiterEmail;
        }
      }
    } else {
      // Find caller organization
      const callerUser = await db.collection('users').findOne({ _id: new ObjectId(auth.user._id) });
      if (!callerUser || !callerUser.organization) {
        return new Response(JSON.stringify({ hrList: [], leadRecruiterEmail: '' }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      filter.organization = { $regex: new RegExp(`^${callerUser.organization.trim()}$`, 'i') };

      const orgDoc = await db.collection('organizations').findOne({
        name: { $regex: new RegExp(`^${callerUser.organization.trim()}$`, 'i') }
      });
      if (orgDoc) {
        leadRecruiterEmail = orgDoc.leadRecruiterEmail;
      }
    }

    const hrList = await db.collection('users')
      .find(filter, { projection: { password: 0 } })
      .toArray();

    return new Response(
      JSON.stringify({ hrList, leadRecruiterEmail }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching HR list API:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// POST: Add a new HR member (HR inherits organization, Admin specifies organization)
export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`hr_post_${ip}`, 15, 60000);
  
  if (rateLimit.isRateLimited) {
    return new Response(JSON.stringify({ message: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const auth = verifyAuth(req, ['hr', 'admin']);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { name, email, designation, organization } = await req.json();

    if (!name || !name.trim() || !email || !email.trim()) {
      return new Response(JSON.stringify({ message: 'Name and Email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    // Check if user already exists
    const existingUser = await db.collection('users').findOne({ email: email.trim().toLowerCase() });
    if (existingUser) {
      return new Response(JSON.stringify({ message: 'User with this email already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let targetOrganization = '';
    if (auth.user.role.toLowerCase() === 'admin') {
      if (!organization || !organization.trim()) {
        return new Response(JSON.stringify({ message: 'Organization is required for Admin actions' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      targetOrganization = organization.trim();
    } else {
      // Find the caller HR user to get their organization
      const hrUser = await db.collection('users').findOne({ _id: new ObjectId(auth.user._id) });
      if (!hrUser || !hrUser.organization) {
        return new Response(JSON.stringify({ message: 'HR organization not configured. Please set organization in profile first.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      targetOrganization = hrUser.organization;
    }

    // Generate a secure temporary password
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const insertResult = await db.collection('users').insertOne({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'hr',
      organization: targetOrganization,
      designation: designation ? designation.trim() : '',
      createdAt: new Date()
    });

    console.log('[Nexus System] Created new HR:', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      temporaryPassword: tempPassword,
      organization: targetOrganization
    });

    // Save temporary credentials locally
    try {
      const filePath = path.join(process.cwd(), 'onboarded_credentials.json');
      let data = [];
      if (fs.existsSync(filePath)) {
        const content = fs.readFileSync(filePath, 'utf8');
        data = JSON.parse(content || '[]');
      }
      data.push({
        name: name.trim(),
        email: email.trim().toLowerCase(),
        temporaryPassword: tempPassword,
        organization: targetOrganization,
        role: 'hr',
        timestamp: new Date().toISOString()
      });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (fileErr) {
      console.error('Failed to write credentials to local file:', fileErr);
    }

    const newHr = await db.collection('users').findOne({ _id: insertResult.insertedId }, { projection: { password: 0 } });

    // Send onboarding email using SMTP
    try {
      const origin = req.headers.get('origin') || 'http://localhost:3000';
      const loginLink = `${origin}/signin`;

      const html = await render(
        <OnboardingEmail
          name={name.trim()}
          email={email.trim().toLowerCase()}
          temporaryPassword={tempPassword}
          organization={targetOrganization}
          role="hr"
          loginLink={loginLink}
        />
      );

      const { error: emailErr } = await sendEmail({
        to: email.trim().toLowerCase(),
        subject: 'Welcome to Nexus - Your HR Coordinator Credentials',
        html
      });

      if (emailErr) {
        console.error('Failed to send HR onboarding email via SMTP:', emailErr);
      }
    } catch (emailErr) {
      console.error('Failed to render or send HR onboarding email:', emailErr);
    }

    return new Response(
      JSON.stringify({ message: 'HR created successfully', hr: newHr }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating HR coordinator:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PUT: Edit HR coordinator details (HR only within same organization, Admin globally)
export async function PUT(req) {
  const auth = verifyAuth(req, ['hr', 'admin']);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { id, name, email, designation } = await req.json();

    if (!id || !name || !name.trim() || !email || !email.trim()) {
      return new Response(JSON.stringify({ message: 'ID, Name and Email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    // Find the HR coordinator to be edited
    const targetHr = await db.collection('users').findOne({ _id: new ObjectId(id), role: 'hr' });
    if (!targetHr) {
      return new Response(JSON.stringify({ message: 'HR coordinator not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Enforce permissions check for HR role
    if (auth.user.role.toLowerCase() !== 'admin') {
      const hrUser = await db.collection('users').findOne({ _id: new ObjectId(auth.user._id) });
      if (!hrUser || !hrUser.organization) {
        return new Response(JSON.stringify({ message: 'HR organization not configured' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if target HR is in same organization
      if (targetHr.organization.toLowerCase() !== hrUser.organization.toLowerCase()) {
        return new Response(JSON.stringify({ message: 'Forbidden: Access denied to different organization data.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Find organization to get lead recruiter email
      const orgDoc = await db.collection('organizations').findOne({
        name: { $regex: new RegExp(`^${hrUser.organization.trim()}$`, 'i') }
      });

      const isLead = orgDoc && orgDoc.leadRecruiterEmail.toLowerCase() === hrUser.email.toLowerCase();
      const isEditingSelf = targetHr.email.toLowerCase() === hrUser.email.toLowerCase();

      if (!isLead && !isEditingSelf) {
        return new Response(JSON.stringify({ message: 'Forbidden: Standard HRs can only edit their own profile details.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Check if new email is already taken by another user
    if (email.trim().toLowerCase() !== targetHr.email.toLowerCase()) {
      const emailTaken = await db.collection('users').findOne({ email: email.trim().toLowerCase() });
      if (emailTaken) {
        return new Response(JSON.stringify({ message: 'Email address is already in use by another user' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Perform updates
    await db.collection('users').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: name.trim(),
          email: email.trim().toLowerCase(),
          designation: designation ? designation.trim() : ''
        }
      }
    );

    const updatedHr = await db.collection('users').findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } });

    return new Response(
      JSON.stringify({ message: 'HR updated successfully', hr: updatedHr }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error editing HR coordinator details:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE: Delete HR member (HR only within same organization, Admin globally)
export async function DELETE(req) {
  const auth = verifyAuth(req, ['hr', 'admin']);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return new Response(JSON.stringify({ message: 'HR ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    const targetHr = await db.collection('users').findOne({ _id: new ObjectId(id), role: 'hr' });
    if (!targetHr) {
      return new Response(JSON.stringify({ message: 'HR coordinator not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Enforce lead recruiter check for HR role
    if (auth.user.role.toLowerCase() !== 'admin') {
      const hrUser = await db.collection('users').findOne({ _id: new ObjectId(auth.user._id) });
      if (!hrUser || !hrUser.organization) {
        return new Response(JSON.stringify({ message: 'Forbidden: Access denied.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Check if target HR is in the same organization
      if (targetHr.organization.toLowerCase() !== hrUser.organization.toLowerCase()) {
        return new Response(JSON.stringify({ message: 'Forbidden: Cannot manage team members from other organizations.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Find organization to get lead recruiter email
      const orgDoc = await db.collection('organizations').findOne({
        name: { $regex: new RegExp(`^${hrUser.organization.trim()}$`, 'i') }
      });

      if (!orgDoc || orgDoc.leadRecruiterEmail.toLowerCase() !== hrUser.email.toLowerCase()) {
        return new Response(JSON.stringify({ message: 'Forbidden: Only the Lead Recruiter of this organization can delete HR coordinators.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Prevent lead recruiter from deleting themselves
      if (targetHr.email.toLowerCase() === hrUser.email.toLowerCase()) {
        return new Response(JSON.stringify({ message: 'Forbidden: The Lead Recruiter cannot delete their own coordinator account.' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    await db.collection('users').deleteOne({ _id: new ObjectId(id) });

    return new Response(JSON.stringify({ message: 'HR coordinator deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting HR coordinator:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
