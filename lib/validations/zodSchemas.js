// lib/validations/zodSchemas.js
import { z } from 'zod';

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectIdSchema = z.string().regex(objectIdRegex, { message: 'Invalid ID format' });

export const signupSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email format'),
  password: z.string().min(6, 'Password is too weak'),
  role: z.preprocess(
    (val) => (val === undefined || val === null || val === '' ? undefined : val),
    z.enum(['candidate', 'expert', 'hr', 'Candidate', 'Expert', 'Hr', 'HR'], {
      errorMap: () => ({ message: 'Role must be candidate, expert, or hr' })
    })
  )
    .optional()
    .default('candidate')
    .transform((val) => val.toLowerCase()),
  organization: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(1, 'Password is required')
});

export const createInterviewSchema = z.object({
  // Existing fields (optional for backward compatibility)
  name: z.string().min(1, 'Candidate name is required').optional(),
  email: z.string().email('Invalid candidate email format').optional(),
  jobPosition: z.string().min(1, 'Job position is required').optional(),
  interviewTime: z.string().min(1, 'Interview date/time is required').optional(),
  HostLink: z.string().url('Host link must be a valid URL').or(z.literal('')).optional().default(''),
  candidateLink: z.string().url('Candidate link must be a valid URL').or(z.literal('')).optional().default(''),
  expertId: z.string().optional(),
  interviewLink: z.string().optional().default(''),
  skillSets: z.string().optional().default(''),
  resumeLink: z.string().optional().default(''),

  // New fields for HR workflow
  hrId: z.string().optional(),
  candidateId: z.string().optional(),
  interviewerIds: z.array(z.string()).optional().default([]),
  role: z.string().optional(),
  scheduledAt: z.string().optional(),
  status: z.enum(['draft', 'scheduled', 'room_generated', 'in_progress', 'completed', 'cancelled']).optional().default('scheduled'),
  meetLink: z.string().url('Meeting link must be a valid URL').or(z.literal('')).nullable().optional().default(null),
  roomId: z.string().nullable().optional().default(null),
  notes: z.string().optional().default('')
});

export const updateInterviewSchema = z.object({
  interviewId: objectIdSchema,
  questions: z.array(z.any()).optional(),
  totalScore: z.number().optional(),
  maxScore: z.number().optional(),
  status: z.string().optional(),
  HostLink: z.string().url('Host link must be a valid URL').or(z.literal('')).optional(),
  candidateLink: z.string().url('Candidate link must be a valid URL').or(z.literal('')).optional(),

  // New fields for HR workflow updates
  name: z.string().optional(),
  hrId: z.string().optional(),
  candidateId: z.string().optional(),
  interviewerIds: z.array(z.string()).optional(),
  role: z.string().optional(),
  scheduledAt: z.string().optional(),
  meetLink: z.string().url('Meeting link must be a valid URL').or(z.literal('')).nullable().optional(),
  roomId: z.string().nullable().optional(),
  notes: z.string().optional(),
  verdict: z.string().optional()
});

export const candidatePatchSchema = z.object({
  id: objectIdSchema,
  name: z.string().optional(),
  email: z.string().email('Invalid email format').optional(),
  skillSets: z.string().optional()
});

export const checkInterviewSchema = z.object({
  interviewID: z.string().min(1, 'Interview ID is required'),
  userEmail: z.string().email('Invalid email format')
});

export const generateQuestionSchema = z.object({
  role: z.string().min(1, 'Role is required'),
  qualifications: z.string().min(1, 'Qualifications are required'),
  difficulty: z.coerce.number().optional().default(1),
  feedback_score: z.coerce.number().optional()
});

export const generateQuestionsSchema = z.object({
  interviewId: z.string().optional(),
  resumeText: z.string().optional(),
  jobRole: z.string().optional(),
  experienceLevel: z.string().optional(),
  expertSpecialization: z.string().optional(),
  targetLevel: z.string().optional(),
  focusAreas: z.union([z.string(), z.array(z.string())]).optional(),
  customPrompt: z.string().optional(),
  questionCount: z.coerce.number().optional().default(3)
});


