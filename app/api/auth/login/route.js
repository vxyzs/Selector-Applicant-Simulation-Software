import { connectToDatabase } from '@/lib/mongodb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { checkRateLimit } from '@/lib/rateLimit';
import { loginSchema } from '@/lib/validations/zodSchemas';
import { config } from '@/lib/config';

export async function POST(req) {
    // 1. Rate Limiting: 15 login attempts per minute per IP
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateLimit = checkRateLimit(`login_${ip}`, 15, 60000);
    
    if (rateLimit.isRateLimited) {
        return new Response(JSON.stringify({ message: 'Too many login attempts. Please try again in a minute.' }), {
            status: 429,
            headers: { 'Content-Type': 'application/json', 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) }
        });
    }

    try {
        const body = await req.json();

        // 2. Schema Validation using Zod
        const result = loginSchema.safeParse(body);
        if (!result.success) {
            const firstError = result.error.issues[0]?.message || 'Invalid input data';
            return new Response(JSON.stringify({ message: firstError }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const { email, password } = result.data;
        const { db } = await connectToDatabase();

        // Safe NoSQL type coercion
        const user = await db.collection('users').findOne({ email: String(email).toLowerCase() });

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return new Response(JSON.stringify({ message: 'Invalid email or password' }), {
                status: 401,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        const token = jwt.sign(
            {
                _id: user._id.toString(),
                email: user.email,
                name: user.name,
                role: user.role
            },
            config.jwtSecret,
            { expiresIn: '15d' }
        );

        return new Response(
            JSON.stringify({ 
                token, 
                user: { _id: user._id, email: user.email, name: user.name, role: user.role } 
            }), 
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
    } catch (error) {
        console.error('Error in login API:', error);
        return new Response(JSON.stringify({ message: 'Internal Server Error' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}
