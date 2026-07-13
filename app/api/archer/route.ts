import { NextResponse } from 'next/server';
import { z } from 'zod';
import { currentUser, normalizeRole } from '@/lib/auth';
import { enforceRateLimit } from '@/lib/rateLimit';
import { ARCHER_KNOWLEDGE, localArcherAnswer } from '@/lib/archerKnowledge';

export const dynamic = 'force-dynamic';

const Body = z.object({
  message: z.string().trim().min(2).max(500),
  path: z.string().max(300).optional(),
  history: z.array(z.object({ role: z.enum(['user','assistant']), content: z.string().max(1200) })).max(8).optional()
});

function extractText(data: any): string {
  if (typeof data?.output_text === 'string') return data.output_text.trim();
  const parts: string[] = [];
  for (const item of data?.output || []) for (const content of item?.content || []) if (typeof content?.text === 'string') parts.push(content.text);
  return parts.join('\n').trim();
}

export async function POST(request: Request) {
  const user = await currentUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Please log in again.' }, { status: 401 });
  const limited = await enforceRateLimit(request, 'archer-chat', Number(process.env.ARCHER_REQUESTS_PER_MINUTE || 12), 60_000, user.id);
  if (limited) return limited;
  let parsed;
  try { parsed = Body.parse(await request.json()); }
  catch { return NextResponse.json({ ok: false, message: 'Enter a question between 2 and 500 characters.' }, { status: 400 }); }

  const fallback = localArcherAnswer(parsed.message);
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return NextResponse.json({ ok: true, answer: fallback, mode: 'built-in' });

  const model = process.env.ARCHER_OPENAI_MODEL || 'gpt-5-mini';
  const context = `Current user role: ${normalizeRole(String(user.role))}. Current restaurant ID is private and must not be repeated. Current page: ${parsed.path || 'unknown'}.`;
  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        instructions: `${ARCHER_KNOWLEDGE}\n${context}`,
        input: [...(parsed.history || []).map((m) => ({ role: m.role, content: m.content })), { role: 'user', content: parsed.message }],
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
    return NextResponse.json({ ok: true, answer: answer.slice(0, 2400), mode: 'ai' });
  } catch (error) {
    console.error('Archer request error', error instanceof Error ? error.message : 'unknown');
    return NextResponse.json({ ok: true, answer: fallback, mode: 'built-in' });
  }
}
