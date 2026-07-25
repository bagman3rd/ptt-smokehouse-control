import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser, normalizeRole } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rateLimit';
import { currentRestaurantForUser } from '@/lib/tenant';
import {
  ARCHER_KNOWLEDGE,
  getArcherIdentityAnswer,
  isArcherIdentityQuestion,
  localArcherAnswer
} from '@/lib/archerKnowledge';
import { screenUserMessage, redactPii, INJECTION_DEFENSE_NOTE } from '@/lib/aiGuard';
import { aiSpendAllowed, recordAiUsage, AI_MAX_TOKENS_PER_CONVERSATION } from '@/lib/cost';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

const Body = z.object({
  message: z.string().trim().min(2).max(500),
  path: z.string().max(300).optional(),
  sessionId: z.string().max(100).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().trim().min(1).max(2400)
      })
    )
    .max(8)
    .optional()
});

function extractText(data: any): string {
  if (typeof data?.output_text === 'string') return data.output_text.trim();
  const parts: string[] = [];
  for (const item of data?.output || [])
    for (const content of item?.content || [])
      if (typeof content?.text === 'string') parts.push(content.text);
  return parts.join('\n').trim();
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

async function logTurn(params: {
  restaurantId: string;
  userId: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  promptTokens: number;
  completionTokens: number;
  flagged: boolean;
}) {
  try {
    await prisma.archerConversationLog.create({
      data: {
        restaurantId: params.restaurantId,
        userId: params.userId,
        sessionId: params.sessionId,
        role: params.role,
        content: redactPii(params.content).slice(0, 4000),
        promptTokens: params.promptTokens,
        completionTokens: params.completionTokens,
        flagged: params.flagged
      }
    });
  } catch {
    // Logging failures must not affect the user.
  }
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Please log in again.' }, { status: 401 });

  const limited = await enforceRateLimit(
    request,
    'archer-chat',
    Number(process.env.ARCHER_REQUESTS_PER_MINUTE || 12),
    60_000,
    user.id
  );
  if (limited) return limited;

  let parsed;
  try {
    parsed = Body.parse(await request.json());
  } catch (error) {
    const message =
      error instanceof z.ZodError && error.issues.some((issue) => issue.path[0] === 'history')
        ? 'Archer could not continue the conversation history. Please ask the question again.'
        : 'Enter a question between 2 and 500 characters.';
    return NextResponse.json({ ok: false, message }, { status: 400 });
  }

  const restaurant = await currentRestaurantForUser(user);
  const sessionId = parsed.sessionId || 'default';

  if (isArcherIdentityQuestion(parsed.message)) {
    return NextResponse.json({ ok: true, answer: getArcherIdentityAnswer(), mode: 'approved-identity' });
  }

  const screen = screenUserMessage(parsed.message);

  const historyTokens = (parsed.history || []).reduce((sum, m) => sum + estimateTokens(m.content), 0);
  if (historyTokens > AI_MAX_TOKENS_PER_CONVERSATION) {
    return NextResponse.json({
      ok: true,
      answer:
        'This conversation has gotten long. To keep things responsive, please start a fresh chat or email support@smokehousecontrol.com for a detailed question.',
      mode: 'handoff'
    });
  }

  const spend = await aiSpendAllowed(restaurant.id);
  if (!spend.allowed) {
    return NextResponse.json({
      ok: true,
      answer:
        "You've reached today's AI assistant limit for this restaurant. I can still answer from the built-in guide, or email support@smokehousecontrol.com and a person will help.",
      mode: 'cap-reached'
    });
  }

  const fallback = localArcherAnswer(parsed.message);
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  await logTurn({
    restaurantId: restaurant.id,
    userId: user.id,
    sessionId,
    role: 'user',
    content: parsed.message,
    promptTokens: estimateTokens(parsed.message),
    completionTokens: 0,
    flagged: screen.flagged
  });

  if (!apiKey) return NextResponse.json({ ok: true, answer: fallback, mode: 'built-in' });

  const model = process.env.ARCHER_OPENAI_MODEL || 'gpt-5-mini';
  const defense = screen.flagged ? `\n${INJECTION_DEFENSE_NOTE}` : '';
  const context = `Current user role: ${normalizeRole(
    String(user.role)
  )}. Current restaurant ID is private and must not be repeated. Current page: ${parsed.path || 'unknown'}.`;

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        instructions: `${ARCHER_KNOWLEDGE}\n${context}${defense}`,
        input: [
          ...(parsed.history || []).map((m) => ({ role: m.role, content: m.content })),
          { role: 'user', content: parsed.message }
        ],
        max_output_tokens: Number(process.env.ARCHER_MAX_OUTPUT_TOKENS || 350),
        store: false
      })
    });
    if (!response.ok) {
      console.error('Archer OpenAI request failed', response.status);
      return NextResponse.json({ ok: true, answer: fallback, mode: 'built-in' });
    }
    const data = await response.json();
    const answer = extractText(data) || fallback;

    const promptTokens = data?.usage?.input_tokens ?? historyTokens + estimateTokens(parsed.message);
    const completionTokens = data?.usage?.output_tokens ?? estimateTokens(answer);
    await recordAiUsage({
      restaurantId: restaurant.id,
      promptTokens,
      completionTokens,
      newConversation: (parsed.history || []).length === 0
    });
    await logTurn({
      restaurantId: restaurant.id,
      userId: user.id,
      sessionId,
      role: 'assistant',
      content: answer,
      promptTokens: 0,
      completionTokens,
      flagged: false
    });

    return NextResponse.json({ ok: true, answer: answer.slice(0, 2400), mode: 'ai' });
  } catch (error) {
    console.error('Archer request error', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ ok: true, answer: fallback, mode: 'built-in' });
  }
}
