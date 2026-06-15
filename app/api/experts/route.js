import { connectToDatabase } from '@/lib/mongodb';
import { verifyAuth } from '@/lib/auth';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { render } from '@react-email/render';
import { sendEmail } from '@/lib/mailer';
import OnboardingEmail from '@/components/onboardingEmail';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  // Allow HR and Experts to query list of experts
  const auth = verifyAuth(req, ['hr', 'expert']);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { db } = await connectToDatabase();
    
    // Find caller to get organization
    const callerUser = await db.collection('users').findOne({ _id: new ObjectId(auth.user._id) });
    
    // Query users with 'expert' role (case-insensitive check is safest)
    const filter = { role: { $regex: /^expert$/i } };
    
    if (callerUser && callerUser.organization) {
      filter.organization = { $regex: new RegExp(`^${callerUser.organization.trim()}$`, 'i') };
    } else {
      // Caller has no organization, return empty array to prevent leakage
      return new Response(
        JSON.stringify({ experts: [] }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const experts = await db.collection('users')
      .find(
        filter,
        { projection: { password: 0 } }
      )
      .toArray();

    return new Response(
      JSON.stringify({ experts }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching experts list API:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

export async function POST(req) {
  // 1. JWT Verification: Only HR allowed to create experts
  const auth = verifyAuth(req, ['hr']);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { name, email, specialization } = await req.json();

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

    // Find the HR user to get their organization
    const hrUser = await db.collection('users').findOne({ _id: new ObjectId(auth.user._id) });
    if (!hrUser || !hrUser.organization) {
      return new Response(JSON.stringify({ message: 'HR organization not configured. Please set organization in profile first.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate a secure temporary password
    const tempPassword = crypto.randomBytes(6).toString('hex'); // 12-char secure alphanumeric password
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const insertResult = await db.collection('users').insertOne({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      role: 'expert',
      organization: hrUser.organization, // Automatically inherit organization from HR
      specialization: specialization ? specialization.trim() : '',
      department: specialization ? specialization.trim() : '', // store in both for schema safety
      createdAt: new Date()
    });

    console.log('[Nexus System] Created new EXPERT:', {
      name: name.trim(),
      email: email.trim().toLowerCase(),
      temporaryPassword: tempPassword,
      organization: hrUser.organization
    });

    // Save temporary credentials locally to an ignored JSON file for easy testing access
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
        organization: hrUser.organization,
        role: 'expert',
        timestamp: new Date().toISOString()
      });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (fileErr) {
      console.error('Failed to write credentials to local file:', fileErr);
    }

    const newExpert = await db.collection('users').findOne({ _id: insertResult.insertedId }, { projection: { password: 0 } });

    // Send onboarding email using SMTP
    try {
      const origin = req.headers.get('origin') || 'http://localhost:3000';
      const loginLink = `${origin}/signin`;

      const html = await render(
        <OnboardingEmail
          name={name.trim()}
          email={email.trim().toLowerCase()}
          temporaryPassword={tempPassword}
          organization={hrUser.organization}
          role="expert"
          loginLink={loginLink}
        />
      );

      const { error: emailErr } = await sendEmail({
        to: email.trim().toLowerCase(),
        subject: 'Welcome to Nexus - Your Expert Account Credentials',
        html
      });

      if (emailErr) {
        console.error('Failed to send expert onboarding email via SMTP:', emailErr);
      }
    } catch (emailErr) {
      console.error('Failed to render or send expert onboarding email:', emailErr);
    }

    return new Response(
      JSON.stringify({ message: 'Expert created successfully', expert: newExpert }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error creating expert:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// PUT: Edit expert details (HR coordinators only)
export async function PUT(req) {
  // 1. JWT Verification: HR only
  const auth = verifyAuth(req, ['hr']);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { id, name, email, specialization } = await req.json();

    if (!id || !name || !name.trim() || !email || !email.trim()) {
      return new Response(JSON.stringify({ message: 'ID, Name and Email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    // Find calling HR to get organization
    const hrUser = await db.collection('users').findOne({ _id: new ObjectId(auth.user._id) });
    if (!hrUser || !hrUser.organization) {
      return new Response(JSON.stringify({ message: 'HR organization not configured' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Find the expert to be edited
    const expertUser = await db.collection('users').findOne({ _id: new ObjectId(id), role: 'expert' });
    if (!expertUser) {
      return new Response(JSON.stringify({ message: 'Expert not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Enforce organization check: Prevent modifying experts of another organization
    if (expertUser.organization.toLowerCase() !== hrUser.organization.toLowerCase()) {
      return new Response(JSON.stringify({ message: 'Forbidden: Access denied to different organization data.' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if new email is already taken by another user
    if (email.trim().toLowerCase() !== expertUser.email.toLowerCase()) {
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
          specialization: specialization ? specialization.trim() : '',
          department: specialization ? specialization.trim() : '' // save both for schema consistency
        }
      }
    );

    const updatedExpert = await db.collection('users').findOne({ _id: new ObjectId(id) }, { projection: { password: 0 } });

    return new Response(
      JSON.stringify({ message: 'Expert updated successfully', expert: updatedExpert }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error editing expert details:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// DELETE: Delete an expert (HR within same organization, Admin globally)
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
      return new Response(JSON.stringify({ message: 'Expert ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    const targetExpert = await db.collection('users').findOne({ _id: new ObjectId(id), role: 'expert' });
    if (!targetExpert) {
      return new Response(JSON.stringify({ message: 'Expert not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Enforce organization check for HR role
    if (auth.user.role.toLowerCase() !== 'admin') {
      const hrUser = await db.collection('users').findOne({ _id: new ObjectId(auth.user._id) });
      if (!hrUser || !hrUser.organization || targetExpert.organization.toLowerCase() !== hrUser.organization.toLowerCase()) {
        return new Response(JSON.stringify({ message: 'Forbidden: Access denied.' }), {
          status: 403,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    await db.collection('users').deleteOne({ _id: new ObjectId(id) });

    return new Response(JSON.stringify({ message: 'Expert deleted successfully' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting expert:', error);
    return new Response(
      JSON.stringify({ message: 'Internal Server Error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

