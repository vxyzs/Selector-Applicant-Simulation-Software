import { GoogleGenerativeAI } from '@google/generative-ai';
import { NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/rateLimit';
import { verifyAuth } from '@/lib/auth';
import { generateQuestionSchema } from '@/lib/validations/zodSchemas';
import { config } from '@/lib/config';

export async function POST(req) {
  // 1. Rate Limiting: 60 requests per minute per IP
  const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
  const rateLimit = checkRateLimit(`genquestion_${ip}`, 60, 60000);
  
  if (rateLimit.isRateLimited) {
      return NextResponse.json({ error: 'Too many requests. Please try again later.' }, {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rateLimit.resetTime - Date.now()) / 1000)) }
      });
  }

  // 2. JWT Verification: Allow candidate or expert
  const auth = verifyAuth(req, ['candidate', 'expert']);
  if (auth.error) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  try {
    const data = await req.json();
    console.log('Received generation data:', data);

    // 3. Schema Validation using Zod
    const result = generateQuestionSchema.safeParse(data);
    if (!result.success) {
        const firstError = result.error.issues[0]?.message || 'Invalid input params';
        return NextResponse.json({ error: firstError }, { status: 400 });
    }

    const { role, qualifications, difficulty, feedback_score } = result.data;

    const genAI = new GoogleGenerativeAI(config.geminiApiKey);
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    let prompt = '';
    if (feedback_score === undefined) {
      prompt = `You are an AI interviewer conducting an interview for the position of ${role}. The candidate has the following qualifications: ${qualifications}. Start with an icebreaker question with a default difficulty of 1.`;
    } else {
      let newDifficulty =
        feedback_score <= 4
          ? Math.max(1, difficulty - 1)
          : Math.min(10, difficulty + 1);
      prompt = `The interviewer has rated the response with a score of ${feedback_score}. Generate a ${
        feedback_score <= 4 ? 'easier' : 'tougher'
      } question related to the ${role} position and the candidate's qualifications: ${qualifications}. The next question should be relevant to the role, and the difficulty level is ${newDifficulty}.`;
    }

    const outputResult = await model.generateContent(prompt);
    const response = await outputResult.response;
    const output = await response.text();
    console.log('Generated output:', output);

    return NextResponse.json({ output });
  } catch (error) {
    console.error('Error generating content:', error);
    return NextResponse.json(
      { error: 'Failed to generate content' },
      { status: 500 }
    );
  }
}
