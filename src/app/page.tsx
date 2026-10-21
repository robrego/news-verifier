'use client';

import { useState, useEffect, useRef } from 'react';
import { verifyNews } from '@/app/actions/verify';
import { BatteryLow, CircleAlert, ImagePlus, Loader2 } from 'lucide-react';
import { SiteHeader, useTheme } from '@/components/SiteHeader';
import { ResultView, type ResultData } from '@/components/ResultView';
import { scoreOf, sentimentOf, getBand } from '@/lib/result';
import { EmptyState } from '@/components/EmptyState';
import { saveToHistory } from '@/lib/history';


export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ResultData | null>(null);
  const [isDark, setIsDark] = useTheme();
  const [status, setStatus] = useState<'idle' | 'success' | 'limit' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [reading, setReading] = useState(false);
  const autoRan = useRef(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleVerify = async (override?: string) => {
    const query = (override ?? input).trim();
    if (!query) return;
    if (override) setInput(override);
    setLoading(true);
    setStatus('idle');

    try {
      const response = await verifyNews(query);

      if (!response.ok) {
        // Only a real quota problem gets the "limit" screen; everything else shows its own message.
        if (response.kind === 'rate_limit') {
          setStatus('limit');
        } else {
          setErrorMessage(response.message);
          setStatus('error');
        }
        setLoading(false);
        return;
      }

      const resultText = response.text;
      const extractedScore = scoreOf(response.text);

      const result: ResultData = {
        score: extractedScore,
        sentiment: sentimentOf(extractedScore),
        analysis: response.text,
        evidence: response.evidence,
        degraded: response.degraded,
        notice: response.notice,
        share: response.share,
        query: /^https?:\/\//i.test(query) ? undefined : query,
      };
      setData(result);
      const band = getBand(result);
      if (response.share && band) {
        saveToHistory({ q: query.slice(0, 200), label: band.label, share: response.share, ts: Date.now() });
      }

      setStatus('success');
    } catch (error) {
      console.error("Verification error:", error);
      setErrorMessage('Could not reach the server. Check your connection and try again.');
      setStatus('error');
    } finally {
      setLoading(false);
    }
  };

  // Links like /?q=... (bookmarklet, share sheet, direct links) run the check straight away.
  useEffect(() => {
    if (autoRan.current) return;
    autoRan.current = true;
    const p = new URLSearchParams(window.location.search);
    const q = (p.get('q') || p.get('url') || p.get('text') || p.get('title') || '').trim();
    if (q) {
      window.history.replaceState(null, '', window.location.pathname);
      handleVerify(q.slice(0, 2000));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Shrinks big screenshots in the browser so uploads stay small and fast.
  const prepareImage = async (file: File): Promise<Blob> => {
    try {
      const bmp = await createImageBitmap(file);
      const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d')?.drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
      return blob ?? file;
    } catch {
      return file;
    }
  };

  const handleImage = async (file: File | undefined | null) => {
    if (!file || reading) return;
    setReading(true);
    setStatus('idle');
    setData(null);
    try {
      const blob = await prepareImage(file);
      const form = new FormData();
      form.append('image', blob, 'screenshot.jpg');
      const res = await fetch('/api/extract', { method: 'POST', body: form });
      const body = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
      if (!res.ok || !body.text) {
        setErrorMessage(body.error ?? 'Could not read that screenshot. Try pasting the text instead.');
        setStatus('error');
        return;
      }
      setReading(false);
      await handleVerify(body.text);
    } catch {
      setErrorMessage('Could not upload that screenshot. Check your connection and try again.');
      setStatus('error');
    } finally {
      setReading(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const handleClear = () => {
    setInput('');
    setData(null);
    setStatus('idle');
    setErrorMessage('');
  };

  return (
    <main className={`min-h-screen relative p-4 sm:p-6 lg:p-24 transition-colors duration-700 ${isDark ? 'bg-[#0A0A0B] text-white' : 'bg-[#F9FAFF] text-slate-900'}`}>
      <div className="max-w-7xl mx-auto">
      <SiteHeader isDark={isDark} onToggle={() => setIsDark(!isDark)} active="news" />

        <section className="mb-20 sm:mb-32">
          <h1 className={`font-display text-[3.5rem] leading-[1.1] sm:text-7xl md:text-[110px] font-bold tracking-tighter mb-10 sm:mb-16 ${isDark ? 'text-white' : 'text-slate-950'}`}>
            Is this <span className="bg-gradient-to-r from-cyan-400 to-blue-600 bg-clip-text text-transparent pr-2">Real?</span>
          </h1>
          
          <div className="relative w-full max-w-4xl">
            <div className={`flex flex-col sm:flex-row items-center gap-3 sm:gap-0 p-3 sm:p-2.5 rounded-[2rem] sm:rounded-3xl border transition-all ${isDark ? 'bg-[#151517] border-white/10' : 'bg-white border-white shadow-xl shadow-blue-500/5'}`}>
              
              <div className="relative w-full flex-grow flex items-center">
                <input 
                  value={input} 
                  onChange={(e) => {
                    setInput(e.target.value);
                    if (data || status === 'limit') {
                      setData(null);
                      setStatus('idle');
                    }
                  }} 
                  onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  onPaste={(e) => {
                    const img = Array.from(e.clipboardData.files).find((f) => f.type.startsWith('image/'));
                    if (img) {
                      e.preventDefault();
                      handleImage(img);
                    }
                  }}
                  placeholder="Paste a headline, a claim or an article link..." 
                  className="w-full pl-6 pr-6 py-4 sm:px-8 outline-none font-medium text-lg sm:text-xl bg-transparent" 
                />
              </div>

              {data || status === 'limit' ? (
                <button 
                  onClick={handleClear} 
                  className={`w-full sm:w-auto h-[60px] sm:h-[68px] px-8 sm:px-12 font-display rounded-2xl font-bold uppercase text-[14px] sm:text-[15px] tracking-[0.12em] inline-flex items-center justify-center gap-2 transition-all active:scale-95 flex-shrink-0 ${isDark ? 'bg-slate-800 text-slate-200 hover:bg-slate-700' : 'bg-slate-200 text-slate-800 hover:bg-slate-300'}`}
                >
                  Clear
                </button>
              ) : (
                <button 
                  onClick={() => handleVerify()} 
                  disabled={loading || !input} 
                  className={`w-full sm:w-auto h-[60px] sm:h-[68px] px-8 sm:px-12 font-display rounded-2xl font-bold uppercase text-[14px] sm:text-[15px] tracking-[0.12em] inline-flex items-center justify-center gap-2 transition-all active:scale-95 flex-shrink-0 ${isDark ? 'bg-blue-500 text-white hover:bg-blue-400 disabled:bg-blue-500/50' : 'bg-slate-950 text-white hover:bg-blue-500 disabled:bg-slate-400'}`}
                >
                  {loading && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
                  {loading ? 'Analyzing' : 'Verify'}
                </button>
              )}
            </div>

            <div className="mt-4 sm:mt-5 flex flex-col items-start gap-3 text-left">
              <p className={`text-[14px] leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                Verify News can make mistakes. Always check critical information.
              </p>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => handleImage(e.target.files?.[0])} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={reading || loading}
                className={`font-display inline-flex items-center gap-2 text-[13px] font-bold uppercase tracking-[0.12em] underline-offset-4 hover:underline disabled:opacity-50 ${isDark ? 'text-blue-300' : 'text-blue-700'}`}
              >
                {reading ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <ImagePlus className="h-4 w-4" aria-hidden />}
                {reading ? 'Reading screenshot' : 'Or check a screenshot of a post'}
              </button>
            </div>

            {status === 'error' && (
              <div role="alert" className={`mt-8 p-6 sm:p-8 rounded-[1.5rem] border ${isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800 shadow-sm'}`}>
                <span className="font-display flex items-center gap-2 font-bold mb-2 uppercase tracking-[0.12em] text-[12px]">
                  <CircleAlert className="h-4 w-4" aria-hidden />
                  Something went wrong
                </span>
                <p className="text-[15px] sm:text-[16px] leading-relaxed">{errorMessage}</p>
              </div>
            )}

            {status === 'limit' && (
              <div className={`mt-8 p-6 sm:p-8 rounded-[1.5rem] border animate-in fade-in slide-in-from-top-4 duration-700 ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800 shadow-sm'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <BatteryLow className="h-9 w-9 shrink-0" aria-hidden />
                  <div>
                    <span className="font-display block font-bold mb-1 uppercase tracking-[0.12em] text-[12px]">Daily limit reached</span>
                    <p className="text-[15px] sm:text-[16px] leading-relaxed">We&apos;ve used today&apos;s free AI quota. Please try again a bit later.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {!data && !loading && status === 'idle' && <EmptyState isDark={isDark} onPick={(t) => handleVerify(t)} />}

        {data && status !== 'limit' && status !== 'error' && <ResultView data={data} isDark={isDark} />}
      </div>
    </main>
  );
}