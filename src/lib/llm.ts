import { groq } from '@ai-sdk/groq';
import { generateText } from 'ai';

// Groq retired llama-3.3-70b-versatile and llama-3.1-8b-instant on 16 Aug 2026.
// Keep model IDs in one place. Each model has its own free-tier quota bucket,
// so falling back to the second one also adds free daily capacity.
export const MODELS = ['openai/gpt-oss-120b', 'openai/gpt-oss-20b'] as const;

export type ErrorKind = 'rate_limit' | 'service' | 'config' | 'bad_input';

export class AppError extends Error {
  kind: ErrorKind;
  constructor(kind: ErrorKind, message: string) {
    super(message);
    this.kind = kind;
  }
}

function statusOf(err: unknown): number | undefined {
  const e = err as { statusCode?: number; status?: number; cause?: { statusCode?: number } };
  return e?.statusCode ?? e?.status ?? e?.cause?.statusCode;
}

// Some reasoning models leak <think> blocks into the text. Strip them.
function stripReasoning(text: string): string {
  return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

export async function generate(opts: {
  system: string;
  prompt: string;
  temperature?: number;
  maxOutputTokens?: number;
}): Promise<string> {
  if (!process.env.GROQ_API_KEY) {
    throw new AppError('config', 'GROQ_API_KEY is missing.');
  }

  let sawRateLimit = false;

  for (const model of MODELS) {
    try {
      const { text } = await generateText({
        model: groq(model),
        system: opts.system,
        prompt: opts.prompt,
        temperature: opts.temperature ?? 0.1,
        // Leave room for reasoning tokens as well as the visible answer.
        maxOutputTokens: opts.maxOutputTokens ?? 1500,
        maxRetries: 0,
        providerOptions: { groq: { reasoningEffort: 'low' } },
      });
      const clean = stripReasoning(text);
      if (clean) return clean;
      console.error(`[llm] ${model} returned empty text`);
    } catch (err) {
      const status = statusOf(err);
      console.error(`[llm] ${model} failed (status ${status ?? 'unknown'})`);
      if (status === 429) sawRateLimit = true;
    }
  }

  throw sawRateLimit
    ? new AppError('rate_limit', 'Free AI quota reached.')
    : new AppError('service', 'The AI service is unavailable right now.');
}
