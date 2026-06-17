import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { checkRateLimit } from '@/lib/rateLimit';
import { signupSchema } from '@/lib/validations/zodSchemas';
import { config } from '@/lib/config';

export async function POST(req) {
    // 1. Rate Limiting: 15 signup requests per minute per IP
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = await checkRateLimit(`signup_${ip}`, 15, 60000);
    
    if (rateLimit.isRateLimited) {
        return new Response(JSON.stringify({ message: 'Too many signup attempts. Please try again in a minute.' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) }
        });
    }

    try {
        const body = await req.json();
        
        // 2. Schema Validation using Zod
        const result = signupSchema.safeParse(body);
        if (!result.success) {
            const firstError = result.error.issues[0]?.message || 'Invalid input data';
            return new Response(JSON.stringify({ message: firstError }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { name, email, password, organization } = result.data;
        
        // Server-side Role Resolution: Force candidate unless email is whitelisted as HR
        const allowedEmailsStr = process.env.ALLOWED_HR_EMAILS || '';
        const allowedEmails = allowedEmailsStr.split(',').map(e => e.trim().toLowerCase()).filter(Boolean);
        const resolvedRole = allowedEmails.includes(String(email).trim().toLowerCase()) ? 'hr' : 'candidate';

        const { db } = await connectToDatabase();
        
        // Use NoSQL injection safe check
        const existingUser = await db.collection('users').findOne({ email: String(email).toLowerCase() });
        if (existingUser) {
            return new Response(JSON.stringify({ message: 'User already exists' }), { 
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const insertResult = await db.collection('users').insertOne({
            name,
            email: String(email).toLowerCase(),
            password: hashedPassword,
            role: resolvedRole,
            organization: resolvedRole === 'hr' && organization ? String(organization).trim() : undefined,
            createdAt: new Date()
        });

        const user = await db.collection('users').findOne({ _id: insertResult.insertedId });

        const token = jwt.sign(
            {
                _id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: user.role,
                organization: user.organization
            },
            config.jwtSecret,
            { expiresIn: '15d' }
        );

        return new Response(
            JSON.stringify({ 
                token, 
                user: { _id: user._id, name: user.name, email: user.email, role: user.role, organization: user.organization }, 
                message: "Account Created Successfully" 
            }), 
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error in signup API:', error);
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), { 
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
