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

// GET: Fetch all organizations (Admin only)
export async function GET(req) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`org_get_${ip}`, 60, 60000);
  
  if (rateLimit.isRateLimited) {
    return new Response(JSON.stringify({ message: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const auth = verifyAuth(req, ['admin']);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { db } = await connectToDatabase();
    const organizations = await db.collection('organizations').find({}).sort({ createdAt: -1 }).toArray();

    const totalOrgs = organizations.length;
    const totalHRs = await db.collection('users').countDocuments({ role: { $regex: /^hr$/i } });
    const totalExperts = await db.collection('users').countDocuments({ role: { $regex: /^expert$/i } });
    const totalCandidates = await db.collection('users').countDocuments({ role: { $regex: /^candidate$/i } });

    return new Response(JSON.stringify({ 
      organizations,
      stats: {
        totalOrgs,
        totalHRs,
        totalExperts,
        totalCandidates
      }
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// POST: Add a new organization and create its lead recruiter (Admin only)
export async function POST(req) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`org_post_${ip}`, 20, 60000);
  
  if (rateLimit.isRateLimited) {
    return new Response(JSON.stringify({ message: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const auth = verifyAuth(req, ['admin']);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { name, leadRecruiterName, leadRecruiterEmail, leadRecruiterDesignation } = await req.json();

    if (!name?.trim() || !leadRecruiterName?.trim() || !leadRecruiterEmail?.trim()) {
      return new Response(JSON.stringify({ message: 'Organization Name, Lead Recruiter Name, and Email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    // Check if organization name exists
    const existingOrg = await db.collection('organizations').findOne({
      name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
    });
    if (existingOrg) {
      return new Response(JSON.stringify({ message: 'Organization with this name already exists' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if lead recruiter email already exists in users
    const existingUser = await db.collection('users').findOne({
      email: leadRecruiterEmail.trim().toLowerCase()
    });
    if (existingUser) {
      return new Response(JSON.stringify({ message: 'Lead recruiter email is already in use by another user' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Insert Organization
    const newOrg = {
      name: name.trim(),
      leadRecruiterName: leadRecruiterName.trim(),
      leadRecruiterEmail: leadRecruiterEmail.trim().toLowerCase(),
      leadRecruiterDesignation: leadRecruiterDesignation ? leadRecruiterDesignation.trim() : 'Lead Recruiter',
      createdAt: new Date()
    };

    const orgResult = await db.collection('organizations').insertOne(newOrg);

    // Create Lead Recruiter User (HR)
    const tempPassword = crypto.randomBytes(6).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const hrUser = {
      name: leadRecruiterName.trim(),
      email: leadRecruiterEmail.trim().toLowerCase(),
      password: hashedPassword,
      role: 'hr',
      organization: name.trim(),
      designation: leadRecruiterDesignation ? leadRecruiterDesignation.trim() : 'Lead Recruiter',
      createdAt: new Date()
    };

    const userResult = await db.collection('users').insertOne(hrUser);

    console.log('[Nexus System] Created new lead recruiter for org:', name, {
      email: hrUser.email,
      temporaryPassword: tempPassword
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
        name: hrUser.name,
        email: hrUser.email,
        temporaryPassword: tempPassword,
        organization: hrUser.organization,
        role: 'hr',
        timestamp: new Date().toISOString(),
        createdVia: 'admin_dashboard'
      });
      fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    } catch (fileErr) {
      console.error('Failed to write credentials to local file:', fileErr);
    }

    // Send onboarding email using SMTP
    try {
      const origin = req.headers.get('origin') || 'http://localhost:3000';
      const loginLink = `${origin}/signin`;

      const html = await render(
        <OnboardingEmail
          name={hrUser.name}
          email={hrUser.email}
          temporaryPassword={tempPassword}
          organization={hrUser.organization}
          role="hr"
          loginLink={loginLink}
        />
      );

      const { error: emailErr } = await sendEmail({
        to: hrUser.email,
        subject: 'Welcome to Nexus - Your Lead Recruiter Credentials',
        html
      });

      if (emailErr) {
        console.error('Failed to send HR onboarding email via SMTP:', emailErr);
      }
    } catch (emailErr) {
      console.error('Failed to render or send HR onboarding email:', emailErr);
    }

    return new Response(JSON.stringify({
      message: 'Organization and lead recruiter created successfully',
      organization: { ...newOrg, _id: orgResult.insertedId }
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error creating organization:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// PUT: Update organization details. If lead recruiter email changes, delete old recruiter and create new recruiter account (Admin only)
export async function PUT(req) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`org_put_${ip}`, 20, 60000);
  
  if (rateLimit.isRateLimited) {
    return new Response(JSON.stringify({ message: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const auth = verifyAuth(req, ['admin']);
  if (auth.error) {
    return new Response(JSON.stringify({ message: auth.error }), {
      status: auth.status,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  try {
    const { id, name, leadRecruiterName, leadRecruiterEmail, leadRecruiterDesignation } = await req.json();

    if (!id || !name?.trim() || !leadRecruiterName?.trim() || !leadRecruiterEmail?.trim()) {
      return new Response(JSON.stringify({ message: 'ID, Organization Name, Lead Recruiter Name, and Email are required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    // Check if organization exists
    const org = await db.collection('organizations').findOne({ _id: new ObjectId(id) });
    if (!org) {
      return new Response(JSON.stringify({ message: 'Organization not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Check if organization name changed and is taken
    const oldOrgName = org.name;
    const newOrgName = name.trim();
    if (oldOrgName.toLowerCase() !== newOrgName.toLowerCase()) {
      const existingOrg = await db.collection('organizations').findOne({
        name: { $regex: new RegExp(`^${newOrgName}$`, 'i') }
      });
      if (existingOrg) {
        return new Response(JSON.stringify({ message: 'Another organization with this name already exists' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    const oldRecruiterEmail = org.leadRecruiterEmail.toLowerCase();
    const newRecruiterEmail = leadRecruiterEmail.trim().toLowerCase();
    
    // Check lead recruiter email change behavior
    if (oldRecruiterEmail !== newRecruiterEmail) {
      // Check if new lead recruiter email already exists in the system
      const existingUser = await db.collection('users').findOne({ email: newRecruiterEmail });
      if (existingUser) {
        return new Response(JSON.stringify({ message: 'New recruiter email is already in use by another user' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Delete the old lead recruiter user
      await db.collection('users').deleteOne({
        email: oldRecruiterEmail,
        role: 'hr',
        organization: { $regex: new RegExp(`^${oldOrgName}$`, 'i') }
      });

      // Create new lead recruiter account
      const tempPassword = crypto.randomBytes(6).toString('hex');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      const hrUser = {
        name: leadRecruiterName.trim(),
        email: newRecruiterEmail,
        password: hashedPassword,
        role: 'hr',
        organization: newOrgName,
        designation: leadRecruiterDesignation ? leadRecruiterDesignation.trim() : 'Lead Recruiter',
        createdAt: new Date()
      };

      await db.collection('users').insertOne(hrUser);

      console.log('[Nexus System] Lead recruiter changed! Deleted old and created new:', {
        oldRecruiterEmail,
        newRecruiterEmail,
        temporaryPassword: tempPassword
      });

      // Save credentials locally
      try {
        const filePath = path.join(process.cwd(), 'onboarded_credentials.json');
        let data = [];
        if (fs.existsSync(filePath)) {
          const content = fs.readFileSync(filePath, 'utf8');
          data = JSON.parse(content || '[]');
        }
        data.push({
          name: hrUser.name,
          email: hrUser.email,
          temporaryPassword: tempPassword,
          organization: hrUser.organization,
          role: 'hr',
          timestamp: new Date().toISOString(),
          createdVia: 'admin_dashboard_update'
        });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
      } catch (fileErr) {
        console.error('Failed to write credentials to local file:', fileErr);
      }

      // Send email using SMTP
      try {
        const origin = req.headers.get('origin') || 'http://localhost:3000';
        const loginLink = `${origin}/signin`;

        const html = await render(
          <OnboardingEmail
            name={hrUser.name}
            email={hrUser.email}
            temporaryPassword={tempPassword}
            organization={hrUser.organization}
            role="hr"
            loginLink={loginLink}
          />
        );

        const { error: emailErr } = await sendEmail({
          to: hrUser.email,
          subject: 'Welcome to Nexus - Your Lead Recruiter Credentials',
          html
        });

        if (emailErr) {
          console.error('Failed to send onboarding email via SMTP:', emailErr);
        }
      } catch (emailErr) {
        console.error('Failed to render or send onboarding email:', emailErr);
      }
    } else {
      // Recruiter email is the same, just update lead recruiter's name and designation
      await db.collection('users').updateOne(
        { email: oldRecruiterEmail, role: 'hr' },
        {
          $set: {
            name: leadRecruiterName.trim(),
            designation: leadRecruiterDesignation ? leadRecruiterDesignation.trim() : 'Lead Recruiter',
            organization: newOrgName // Update in case org name changed
          }
        }
      );
    }

    // Cascade update organization name for all associated users
    if (oldOrgName.toLowerCase() !== newOrgName.toLowerCase()) {
      await db.collection('users').updateMany(
        { organization: { $regex: new RegExp(`^${oldOrgName}$`, 'i') } },
        { $set: { organization: newOrgName } }
      );
    }

    // Update organization details
    await db.collection('organizations').updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          name: newOrgName,
          leadRecruiterName: leadRecruiterName.trim(),
          leadRecruiterEmail: newRecruiterEmail,
          leadRecruiterDesignation: leadRecruiterDesignation ? leadRecruiterDesignation.trim() : 'Lead Recruiter',
          updatedAt: new Date()
        }
      }
    );

    const updatedOrg = await db.collection('organizations').findOne({ _id: new ObjectId(id) });

    return new Response(JSON.stringify({
      message: 'Organization updated successfully',
      organization: updatedOrg
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error updating organization:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// DELETE: Delete organization and cascade delete its users (Admin only)
export async function DELETE(req) {
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`org_delete_${ip}`, 20, 60000);
  
  if (rateLimit.isRateLimited) {
    return new Response(JSON.stringify({ message: 'Too many requests. Please try again later.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  const auth = verifyAuth(req, ['admin']);
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
      return new Response(JSON.stringify({ message: 'Organization ID is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { db } = await connectToDatabase();

    // Check if organization exists
    const org = await db.collection('organizations').findOne({ _id: new ObjectId(id) });
    if (!org) {
      return new Response(JSON.stringify({ message: 'Organization not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const orgName = org.name;

    // Delete organization document
    await db.collection('organizations').deleteOne({ _id: new ObjectId(id) });

    // Cascade delete associated users (HRs, experts, candidates)
    const deleteUsersResult = await db.collection('users').deleteMany({
      organization: { $regex: new RegExp(`^${orgName}$`, 'i') }
    });

    console.log(`[Nexus System] Deleted organization ${orgName} and ${deleteUsersResult.deletedCount} associated users.`);

    return new Response(JSON.stringify({
      message: 'Organization and associated users deleted successfully'
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error deleting organization:', error);
    return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
