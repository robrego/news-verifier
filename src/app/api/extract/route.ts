import { NextRequest } from 'next/server';
import { allowRequest } from '@/lib/guard';

// Reads the main claim out of a screenshot (a tweet, a post, a headline). The image is sent to the model
// and discarded: nothing is stored. Output is only ever used as the text the visitor then verifies.
export const runtime = 'nodejs';

const VISION_MODEL = 'qwen/qwen3.8-27b';
const MAX_BYTES = 3_500_000; // stays under Vercel's 4.5 MB request limit
const TYPES = new Set(['image/png', 'image/jpeg', 'image/webp']);

const PROMPT =
  'This image is a screenshot of a social media post, news headline or article. ' +
  'Reply with ONLY the single main factual claim it makes, as one plain sentence in the language of the image, at most 200 characters. ' +
  'Do not add commentary, quotation marks or the name of the poster. ' +
  'If the image has no readable factual claim, reply with exactly: NONE';

function clean(text: string): string {
  return text
    .replace(/<think>[\s\S]*?<\/think>/gi, '')
    .replace(/^["'“”\s]+|["'“”\s]+$/g, '')
    .replace(/\s+/g, ' ')
    .slice(0, 300)
    .trim();
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export async function POST(req: NextRequest) {
  if (!process.env.GROQ_API_KEY) return json({ error: 'Reading screenshots is not available right now.' }, 503);
  if (!(await allowRequest('extract', 5, 60_000))) {
    return json({ error: 'Too many screenshots in a minute. Wait a moment and try again.' }, 429);
  }

  let file: File | null = null;
  try {
    const form = await req.formData();
    const f = form.get('image');
    file = f instanceof File ? f : null;
  } catch {
    return json({ error: 'Could not read that upload.' }, 400);
  }
  if (!file || !TYPES.has(file.type)) return json({ error: 'Use a PNG, JPEG or WebP image.' }, 400);
  if (file.size > MAX_BYTES) return json({ error: 'That image is too large. Try a smaller screenshot.' }, 413);

  const b64 = Buffer.from(await file.arrayBuffer()).toString('base64');
  const body = {
    model: VISION_MODEL,
    temperature: 0,
    max_tokens: 800,
    messages: [
      {
        role: 'user',
        content: [
          { type: 'text', text: PROMPT },
          { type: 'image_url', image_url: { url: `data:${file.type};base64,${b64}` } },
        ],
      },
    ],
  };

  // Reasoning options differ between model versions. Try the quiet ones first and fall back on a 400.
  const variants: Record<string, unknown>[] = [{ reasoning_effort: 'none' }, { reasoning_format: 'hidden' }, {}];
  let rateLimited = false;

  for (const extra of variants) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${process.env.GROQ_API_KEY}` },
        body: JSON.stringify({ ...body, ...extra }),
        signal: AbortSignal.timeout(25_000),
      });
      if (res.status === 400) {
        console.error('[extract] 400 with', JSON.stringify(extra), (await res.text()).slice(0, 200));
        continue;
      }
      if (res.status === 429) {
        rateLimited = true;
        break;
      }
      if (!res.ok) {
        console.error('[extract] status', res.status);
        break;
      }
      const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
      const text = clean(data.choices?.[0]?.message?.content ?? '');
      if (!text || /^none\.?$/i.test(text)) return json({ error: 'No readable claim found in that image.' }, 422);
      return json({ text });
    } catch (err) {
      console.error('[extract] request failed', (err as Error).message);
      break;
    }
  }

  return rateLimited
    ? json({ error: "Today's free quota for reading screenshots is used up. Paste the text instead." }, 429)
    : json({ error: 'Could not read that screenshot. Try pasting the text instead.' }, 502);
}
