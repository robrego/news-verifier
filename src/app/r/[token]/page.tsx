import type { Metadata } from 'next';
import Link from 'next/link';
import { readShareToken } from '@/lib/share';
import { scoreOf, sentimentOf, getBand, summaryOf } from '@/lib/result';
import { SharedShell } from '@/components/SharedShell';

// Results are private by design: the link is the only way to see one.
const NO_INDEX = { index: false, follow: false } as const;

type Props = { params: Promise<{ token: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const shared = readShareToken(decodeURIComponent(token));
  if (!shared) return { title: 'Link not valid | Verify News', robots: NO_INDEX };

  const score = scoreOf(shared.text);
  const band = getBand({ score, analysis: shared.text });
  const summary = summaryOf(shared.text);
  const title = `${band ? band.label : 'Result'}: ${shared.query}`.slice(0, 90);
  const description = summary.slice(0, 200) || 'A fact-check result from Verify News.';
  return {
    title: `${title} | Verify News`,
    description,
    robots: NO_INDEX,
    openGraph: { title, description, type: 'article' },
    twitter: { card: 'summary', title, description },
  };
}

export default async function SharedResultPage({ params }: Props) {
  const { token } = await params;
  const shared = readShareToken(decodeURIComponent(token));

  if (!shared) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6 bg-[#F9FAFF] text-slate-900">
        <div className="max-w-md text-center">
          <h1 className="text-3xl font-bold tracking-tight">This link is not valid</h1>
          <p className="mt-4 text-slate-500 leading-relaxed">
            It may have been cut short when it was copied, or it was created before the site was last reset. Ask for the link again, or run the check yourself.
          </p>
          <Link href="/" className="mt-8 inline-block rounded-2xl bg-slate-950 px-8 py-4 text-[13px] font-bold uppercase tracking-[0.15em] text-white hover:bg-blue-500">
            Go to Verify News
          </Link>
        </div>
      </main>
    );
  }

  const score = scoreOf(shared.text);
  const checkedAt = new Date(shared.ts).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

  return (
    <SharedShell
      query={shared.query}
      checkedAt={checkedAt}
      data={{ score, sentiment: sentimentOf(score), analysis: shared.text, evidence: shared.evidence }}
    />
  );
}
