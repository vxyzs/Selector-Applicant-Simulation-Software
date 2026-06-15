import { ChatOpenAI } from '@langchain/openai';
import { PromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';

// Define the output schema using Zod for robust validation of dynamic categories
const categoryStructureSchema = z.object({
  category: z.string().min(2),
  objective: z.string().min(5),
  difficulty: z.string().min(2),
  questions: z.array(z.string().min(5)),
});

const interviewStructureSchema = z.object({
  interviewStructure: z.array(categoryStructureSchema),
});

/**
 * Clean and parse LLM JSON responses, handling code block wraps or prefix text.
 * @param {string} rawOutput
 * @returns {object} Parsed JSON object
 */
function parseJSONOutput(rawOutput) {
  if (!rawOutput) {
    throw new Error('Received empty output from model');
  }

  let cleaned = rawOutput.trim();

  // Strip markdown code fences if present (e.g. ```json ... ```)
  if (cleaned.startsWith('```')) {
    cleaned = cleaned.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
  }

  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    // Attempt to locate the first outer JSON array or object block
    const match = cleaned.match(/[\{\[][\s\S]*[\}\]]/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (nestedErr) {
        throw new Error(`Regex JSON extraction failed: ${nestedErr.message}`);
      }
    }
    throw new Error(`Failed to parse raw output as JSON: ${err.message}`);
  }
}

/**
 * Returns dynamic fallback questions tailored to the job role, levels, and focus areas.
 */
function getFallbackQuestions(jobRole, experienceLevel, targetLevel, expertSpecialization, focusAreas, customPrompt, questionCount) {
  const role = jobRole || 'Software Engineer';
  const level = targetLevel || experienceLevel || 'mid';
  const spec = expertSpecialization || 'Fullstack Development';
  const count = questionCount || 3;
  
  // Decide categories dynamically based on focusAreas, jobRole, customPrompt
  const query = `${focusAreas || ''} ${customPrompt || ''} ${jobRole || ''}`.toLowerCase();
  
  let categories = [];
  if (query.includes('dsa') || query.includes('algo') || query.includes('cp') || query.includes('competitive')) {
    categories = [
      { category: "Data Structures & Algorithms", objective: "Evaluate basic algorithmic problem solving and complexity tradeoffs", difficulty: level },
      { category: "Advanced Problem Solving", objective: "Evaluate complex tree, graph, or dynamic programming logic", difficulty: level },
      { category: "Practical Code Optimization", objective: "Evaluate capability to refactor algorithms for optimal performance", difficulty: level }
    ];
  } else if (query.includes('machine learning') || query.includes('ml') || query.includes('ai') || query.includes('rag')) {
    categories = [
      { category: "Model Architectures", objective: "Evaluate understanding of training pipeline, embeddings, and architectures", difficulty: level },
      { category: "RAG & Vector DBs", objective: "Evaluate knowledge of vector databases, chunking strategies, and search latency", difficulty: level },
      { category: "Model Deployment & Scaling", objective: "Evaluate capability to deploy ML pipelines to production environments", difficulty: level }
    ];
  } else if (query.includes('system design') || query.includes('distributed') || query.includes('architecture')) {
    categories = [
      { category: "Distributed System Scaling", objective: "Evaluate design of highly available, partitioned, and consistent systems", difficulty: level },
      { category: "Database & Storage Design", objective: "Evaluate selection of database engines and schema partition strategies", difficulty: level },
      { category: "Message Queues & Event-Driven", objective: "Evaluate pub/sub broker mechanics and event consistency guarantees", difficulty: level }
    ];
  } else {
    // Standard software development
    categories = [
      { category: "Engineering Fundamentals", objective: "Evaluate core concepts, concurrency models, and runtime details of the tech stack", difficulty: level },
      { category: "Resume & Project Design", objective: "Evaluate structural choices and trade-offs of candidate's past work", difficulty: level },
      { category: "System Architecture & APIs", objective: "Evaluate API contract designs, security integrations, and data persistence models", difficulty: level }
    ];
  }

  // Generate fallback questions for each category
  const interviewStructure = categories.map(cat => {
    let questions = [];
    if (cat.category === "Data Structures & Algorithms") {
      questions = [
        "Explain the performance tradeoffs between a self-balancing BST and a Hash Map. When is the BST preferred?",
        "Describe how you would resolve hashing collisions in a custom high-throughput cache.",
        "How would you optimize a search traversal inside a high-dimensional sparse array?"
      ];
    } else if (cat.category === "Advanced Problem Solving") {
      questions = [
        "Given a graph representing system dependencies, write an algorithm to identify circular dependencies.",
        "How would you implement a sliding window maximum using a double-ended queue in linear time?",
        "Design a dynamic programming algorithm to calculate the longest common subsequence across massive data frames."
      ];
    } else if (cat.category === "Practical Code Optimization") {
      questions = [
        "Explain how you would optimize a slow recursion cycle that exceeds stack limits by converting it to an iterative stack loop.",
        "How would you refactor a matrix manipulation script to make use of machine word size parallelism?",
        "Review a code snippet that leads to a memory leak because of open event listeners, and write the fix."
      ];
    } else if (cat.category === "Model Architectures") {
      questions = [
        "Explain the key architectural differences between a standard Transformer encoder and decoder.",
        "What loss functions would you choose for a multi-label classification problem under highly skewed data?",
        "How do you evaluate and prevent gradient explosion in deep neural nets without batch normalization?"
      ];
    } else if (cat.category === "RAG & Vector DBs") {
      questions = [
        "Compare cosine similarity, inner product, and L2 distance for vector indexing and search efficiency.",
        "Describe a scenario where parent-child chunking outperforms recursive character chunking in a search pipeline.",
        "How do you manage metadata filtering in vector indices without causing query performance degradation?"
      ];
    } else if (cat.category === "Model Deployment & Scaling") {
      questions = [
        "How would you optimize the latency of an LLM inference pipeline using quantization (e.g. AWQ, GPTQ)?",
        "Design a multi-gpu load-balancer that routes incoming tensor execution tasks with minimal queuing latency.",
        "How do you build a drift-detection pipeline for a real-time recommendation agent?"
      ];
    } else if (cat.category === "Distributed System Scaling") {
      questions = [
        "How does Paxos differ from Raft in maintaining distributed log consensus under split-brain scenarios?",
        "Design a rate-limiting service coordinated across 5 geographical regions with sub-10ms validation latency.",
        "Explain the trade-offs between dynamic partitioning and consistent hashing for horizontal key distribution."
      ];
    } else if (cat.category === "Database & Storage Design") {
      questions = [
        "Under what query patterns would you choose LSM-trees (e.g. Cassandra) over B+ trees (e.g. Postgres)?",
        "Describe how you would handle write amplification in SSD-backed transactional databases.",
        "How do you implement zero-downtime database schema migration on a table containing 100M+ rows?"
      ];
    } else if (cat.category === "Message Queues & Event-Driven") {
      questions = [
        "What are the latency tradeoffs of idempotent consumers in Kafka when strict order guarantee is active?",
        "How would you design dead-letter queue (DLQ) retry policies for transient network dropouts vs validation errors?",
        "Compare event sourcing and change data capture (CDC) for synchronizing downstream read models."
      ];
    } else if (cat.category === "Engineering Fundamentals") {
      questions = [
        "Explain how asynchronous event loops handle scheduling priorities between microtasks and macrotasks.",
        "How do concurrency primitives differ from locks in preventing thread lockouts under high CPU load?",
        "Describe memory management, garbage collection phases, and references tracking in your primary language."
      ];
    } else if (cat.category === "Resume & Project Design") {
      questions = [
        "Walk through a technical decision you made on a past project (e.g., database choice, framework) and how you validated it.",
        "In your past systems, how did you locate, profile, and fix memory leaks or thread blocks?",
        "What telemetry metrics and monitoring systems did you deploy to capture production outages early?"
      ];
    } else if (cat.category === "System Architecture & APIs") {
      questions = [
        "How do you prevent cascade failures across internal microservices using circuit breakers or backpressure?",
        "Design a secure, rate-limited REST/GraphQL API gateway supporting token caching and dynamic routing.",
        "Describe a strategy for synchronizing distributed transactions across multiple bounded contexts without two-phase commit."
      ];
    } else {
      questions = [
        "Explain a complex architectural challenge you solved recently, focusing on performance tradeoffs.",
        "How do you configure validation checkpoints in a CI/CD build pipeline to prevent breaking regressions?",
        "Write a clean debugging layout to profile resource consumption and identify memory spikes under load."
      ];
    }
    
    cat.questions = questions.slice(0, count);
    return cat;
  });

  return { interviewStructure };
}

// Stage 1 Prompt Template: Design dynamic interview structure
const structurePromptTemplate = new PromptTemplate({
  template: `You are an elite technical interviewer designing a customized interview plan.
Your task is to dynamically design the optimal categories (sections) for an interview based on the candidate's profile and requirements.

Inputs:
- Job Role: {jobRole}
- Experience Level: {experienceLevel}
- Target Level: {targetLevel}
- Expert Specialization: {expertSpecialization}
- Focus Areas: {focusAreas}
- Custom Instructions: {customPrompt}
- Candidate Resume Text: {resumeText}

Guidelines:
1. Design exactly 3 to 5 distinct interview categories/sections.
2. The categories should test skills relevant to the Job Role, Target Level, Expert Specialization, and Focus Areas.
3. Incorporate Custom Instructions into the designed categories (e.g. if the custom instruction asks for real-world debugging, make sure there is a "Debugging" or "Troubleshooting" category).
4. Specify a clear, testing-focused Objective for each category.
5. Set the Difficulty for each category tailored to the candidate's Target Level/Experience Level.
6. Make categories specific and dynamic. Do not use generic labels. Use titles like "Distributed Systems", "Resume Projects", "Concurrency", "RAG & Vector Search", "API Architecture", etc.

You MUST respond strictly with a valid JSON array of category objects matching the schema below. Do not include any introductory text, markdown formatting (like \`\`\`json), or conversational filler.

JSON Schema:
[
  {{
    "category": "Category Name (1-3 words)",
    "objective": "Brief description of what this section evaluates (1 sentence)",
    "difficulty": "Target difficulty level"
  }}
]`,
  inputVariables: ['jobRole', 'experienceLevel', 'targetLevel', 'expertSpecialization', 'focusAreas', 'customPrompt', 'resumeText'],
});

// Stage 2 Prompt Template: Populate questions per category
const questionsPromptTemplate = new PromptTemplate({
  template: `You are an elite technical interviewer. Generate a list of highly contextual, non-generic, and personalized questions matching the pre-designed interview categories.

Inputs:
- Job Role: {jobRole}
- Experience Level: {experienceLevel}
- Target Level: {targetLevel}
- Candidate Resume Text: {resumeText}
- Pre-Designed Interview Categories: {categoriesStructure}
- Target Number of Questions per Category: {questionCount}

Question Quality Guidelines:
- PERSONALIZED: Deep-dive into specific projects, architectural decisions, and claimed technologies listed in the Candidate Resume Text. If the resume is empty or not available, target typical engineering challenges for {jobRole} at the {targetLevel} level.
- PRACTICAL: Formulate practical debugging, trade-off analysis, troubleshooting, or implementation questions rather than trivia (e.g. do NOT ask definition questions like "What is Docker?" or "What is polymorphism?").
- CATEGORY-SPECIFIC: Ensure each question strictly evaluates the designated "objective" and matches the target "difficulty" of its category.
- NON-GENERIC: Design questions that are realistic, situational, and test hands-on production experience.

You MUST respond strictly with a valid JSON object matching the schema below. Do not include any introductory text, markdown formatting (like \`\`\`json), or conversational filler.

JSON Schema:
{{
  "interviewStructure": [
    {{
      "category": "Category Name from input structure",
      "objective": "Objective from input structure",
      "difficulty": "Difficulty from input structure",
      "questions": [
        "Dynamic question 1 (tailored to resume and category)",
        "Dynamic question 2 (tailored to resume and category)"
      ]
    }}
  ]
}}`,
  inputVariables: ['jobRole', 'experienceLevel', 'targetLevel', 'resumeText', 'categoriesStructure', 'questionCount'],
});

/**
 * Generate dynamic contextual interview questions based on resume, role, experience, target level, and focus areas.
 */
export async function generateQuestions({
  resumeText,
  jobRole,
  experienceLevel,
  expertSpecialization,
  targetLevel,
  focusAreas,
  customPrompt,
  questionCount
}) {
  const role = jobRole ? jobRole.trim() : 'Software Engineer';
  const level = experienceLevel ? experienceLevel.trim() : 'Mid-Level';
  const targetLvl = targetLevel ? targetLevel.trim() : 'mid';
  const specialization = expertSpecialization ? expertSpecialization.trim() : 'Software Development';
  const focus = focusAreas && focusAreas.trim() 
    ? focusAreas.trim() 
    : role; // Focus area should be job role initially if not explicitly set
  const count = questionCount || 3;
  
  // Safe handling / fallback if resume text extraction failed or was skipped
  const resume = resumeText && resumeText.trim() && !resumeText.includes('failed')
    ? resumeText.trim()
    : 'Not Available (Fallback Mode: Generate questions targeting standard projects, tech stacks, and skills expected of a candidate in this role and level).';

  const customGuidelines = customPrompt && customPrompt.trim()
    ? `Expert Custom Focus Instructions: Generate questions targeting, focusing on, and testing these specific aspects: ${customPrompt.trim()}`
    : 'None.';

  try {
    const model = new ChatOpenAI({
      apiKey: process.env.HF_TOKEN || process.env.OPENAI_API_KEY || 'stub-key',
      openAIApiKey: process.env.HF_TOKEN || process.env.OPENAI_API_KEY || 'stub-key',
      configuration: {
        baseURL: process.env.OPENAI_API_BASE || 'https://router.huggingface.co/v1',
      },
      modelName: process.env.MODEL_NAME || 'openai/gpt-oss-safeguard-20b',
      temperature: 0.1,
      maxRetries: 2,
    });

    // --- STAGE 1: Design dynamic interview structure ---
    console.log('[generateQuestions] Formatting Stage 1 (Structure) prompt...');
    const stage1Prompt = await structurePromptTemplate.format({
      jobRole: role,
      experienceLevel: level,
      targetLevel: targetLvl,
      expertSpecialization: specialization,
      focusAreas: focus,
      customPrompt: customGuidelines,
      resumeText: resume.substring(0, 4000) // keep within token budget if extremely large
    });

    console.log('[generateQuestions] Calling Model for Stage 1...');
    const result1 = await model.invoke(stage1Prompt);
    const structureRaw = result1.content;
    const parsedStructure = parseJSONOutput(structureRaw);
    
    // Basic validation of Stage 1 array output
    if (!Array.isArray(parsedStructure) || parsedStructure.length === 0) {
      throw new Error('Stage 1 structure generation did not return a valid array of categories');
    }
    
    console.log('[generateQuestions] Stage 1 Structure constructed:', JSON.stringify(parsedStructure));

    // --- STAGE 2: Generate questions per category ---
    console.log('[generateQuestions] Formatting Stage 2 (Questions) prompt...');
    const stage2Prompt = await questionsPromptTemplate.format({
      jobRole: role,
      experienceLevel: level,
      targetLevel: targetLvl,
      resumeText: resume,
      categoriesStructure: JSON.stringify(parsedStructure),
      questionCount: count
    });

    console.log('[generateQuestions] Calling Model for Stage 2...');
    const result2 = await model.invoke(stage2Prompt);
    const questionsRaw = result2.content;
    const parsedQuestionsJson = parseJSONOutput(questionsRaw);

    const validatedData = interviewStructureSchema.parse(parsedQuestionsJson);
    return validatedData;

  } catch (error) {
    console.error('[generateQuestions] Generation failed, falling back to dynamic generation. Error:', error.message);
    // Return dynamic fallback structure matching parameters
    return getFallbackQuestions(role, level, targetLvl, specialization, focus, customPrompt, count);
  }
}
