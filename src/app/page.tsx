'use client';

import { useState, useEffect } from 'react';
import { verifyNews } from '@/app/actions/verify';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export default function Home() {
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<{ score: number; sentiment: string; analysis: string } | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'limit'>('idle');

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const handleVerify = async () => {
    if (!input) return;
    setLoading(true);
    setStatus('idle');

    const useMock = false; 

    try {
      let resultText: string;

      if (useMock) {
        await new Promise(resolve => setTimeout(resolve, 1500));
        resultText = `Forensic analysis suggests high factual integrity regarding the Global Day of Action coordination in Southern California.
Trust Score: 94

**Factual Consensus**
• Primary Status: Verified
• Major Outlets: LA Times, Reuters, Al Jazeera
• Missing Context: Specific local permits cited

**Logical Fallacies Detected**
• None Identified
• The report maintains a neutral, observational tone

**Supporting Evidence**
• Data: 15,000+ confirmed by crowd-mapping AI
• Timeline: Syncs with live 2:00 PM PST feeds

**Source Reliability & Verdict**
• Source Rank: Tier-1 Legacy Media
• Final Verdict: Credible Field Reporting

**Sources Investigated**
• https://abc7.com/live
• https://latimes.com/local
• https://reuters.com/world`;
      } else {
        const response = await verifyNews(input);
        
        if (!response || response.includes('Error') || response.includes('Connection Error') || response.includes('429')) {
          setStatus('limit');
          setLoading(false);
          return;
        }
        resultText = response;
      }

      const scoreMatch = resultText.match(/Trust Score:\s*(\d+)/i);
      const extractedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;

      let sentiment = "Analyzed";
      if (extractedScore > 75) sentiment = "Verified";
      else if (extractedScore < 40) sentiment = "Suspicious";

      setData({
        score: extractedScore,
        sentiment: sentiment,
        analysis: resultText
      });
      
      setStatus('success');
    } catch (error) {
      console.error("Verification error:", error);
      setStatus('limit');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setInput('');
    setData(null);
    setStatus('idle');
  };

  const renderParsedAnalysis = (text: string) => {
    if (!text) return null;

    const sections = text.replace(/Trust Score[:\s*]*\d+/gi, '').split(/\*\*(.*?)\*\*/g);
    const introSummary = sections[0].trim();
    const coreAnalysis = sections.slice(1);

    if (coreAnalysis.length === 0) {
      return (
        <div className={`p-6 whitespace-pre-wrap leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
          {text}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-12 gap-y-0">
        {introSummary && (
          <div className={`col-span-12 mb-10 pb-10 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
            <h4 className="text-[12px] font-bold uppercase tracking-[0.2em] text-blue-500 mb-5">Summary</h4>
            <p className={`text-xl sm:text-2xl font-medium leading-snug italic pr-0 sm:pr-6 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>"{introSummary}"</p>
          </div>
        )}

        {coreAnalysis.map((part, i) => {
          if (i % 2 === 0) {
            const title = part.replace(/[:*]/g, '').trim();
            const lower = title.toLowerCase();
            let icon = "○";
            let color = isDark ? "text-slate-500" : "text-slate-400";
            
            if (lower.includes('fallacy')) { icon = "⚠️"; color = "text-rose-500"; }
            else if (lower.includes('consensus')) { icon = "✓"; color = "text-blue-500"; }
            else if (lower.includes('evidence')) { icon = "📊"; color = "text-amber-500"; }
            else if (lower.includes('verdict')) { icon = "⚖️"; color = "text-blue-500"; }
            else if (lower.includes('sources')) { icon = "🔗"; color = "text-blue-500"; }

            return (
              <div key={i} className="col-span-12 mt-10 sm:mt-14 mb-6 sm:mb-8 flex items-center gap-4 sm:gap-5">
                <span className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-lg border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100'} ${color}`}>
                  {icon}
                </span>
                <h3 className={`font-bold text-[11px] sm:text-[12px] uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</h3>
                <div className={`flex-grow h-[1px] ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}></div>
              </div>
            );
          }

          // BULLETPROOF PARSER: Split by newlines, bullet points, OR asterisks
          const bullets = part.trim()
          .split(/[\n•]+|\*(?=\s)/)
          .map(b => b.replace(/^[•\-\*]\s*/, '').trim())
          .filter(b => b.length > 0);          
          return (
            <div key={i} className={`col-span-12 grid grid-cols-1 ${bullets.length > 1 ? 'md:grid-cols-2' : ''} gap-4 sm:gap-5`}>
              {bullets.map((bullet, idx) => {
                const content = bullet.trim();
                
                // BULLETPROOF URL PARSER: Finds any http/https link inside the text
                const urlMatch = content.match(/(https?:\/\/[^\s]+)/);
                const isUrl = urlMatch !== null;
                
                if (isUrl) {
                  const finalUrl = urlMatch[0];
                  let domainText = finalUrl;
                  try {
                    domainText = new URL(finalUrl).hostname.replace('www.', '');
                  } catch (e) {
                    domainText = finalUrl.split('/')[2] || finalUrl;
                  }

                  return (
                    <a key={idx} href={finalUrl} target="_blank" rel="noreferrer" className={`flex items-center gap-4 p-5 sm:p-6 border rounded-2xl transition-all ${isDark ? 'bg-white/5 border-white/10 hover:bg-white/10' : 'bg-white border-slate-100 hover:border-blue-500/30'}`}>
                      <span className="text-blue-500 text-lg flex-shrink-0">🔗</span>
                      <span className={`text-[12px] sm:text-[13px] font-medium tracking-tight truncate ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{domainText}</span>
                    </a>
                  );
                }

                const lowerContent = content.toLowerCase();
                const isNegative = lowerContent.includes('missing') || lowerContent.includes('risk') || lowerContent.includes('fallacy') || lowerContent.includes('low');
                const isPositive = lowerContent.includes('verified') || lowerContent.includes('credible') || lowerContent.includes('high') || lowerContent.includes('none identified');

                const dotColor = isNegative ? 'bg-rose-500' : isPositive ? 'bg-blue-500' : 'bg-slate-400';
                const borderColor = isPositive 
                  ? (isDark ? 'border-blue-500/30' : 'border-blue-500/20') 
                  : (isNegative ? (isDark ? 'border-rose-500/20' : 'border-rose-500/10') : (isDark ? 'border-white/5' : 'border-slate-100'));

                return (
                  <div key={idx} className={`border p-6 sm:p-8 rounded-2xl transition-all ${isDark ? 'bg-white/[0.02]' : 'bg-white'} ${borderColor}`}>
                    <div className="flex items-start gap-4 sm:gap-5">
                      <div className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0 mt-2`} />
                      <p className={`text-[1rem] sm:text-[1.05rem] leading-relaxed ${isPositive ? 'font-medium' : 'font-normal'} ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {content}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <main className={`min-h-screen relative p-4 sm:p-6 lg:p-24 transition-colors duration-700 ${spaceGrotesk.className} ${isDark ? 'bg-[#0A0A0B] text-white' : 'bg-[#F9FAFF] text-slate-900'}`}>
      <div className="max-w-7xl mx-auto">
        <header className="mb-12 sm:mb-20 flex justify-between items-center">
          <div className="flex items-center gap-3 font-semibold tracking-wide">
            <div className={`relative w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center border transition-all ${isDark ? 'border-white/20 text-white/70' : 'border-slate-300 text-slate-400'}`}>
              <span className="not-italic text-sm leading-none mt-[1px]">V</span>
            </div>
            <span className={`text-sm tracking-widest uppercase hidden sm:inline-block ${isDark ? 'text-white/60 font-light' : 'text-slate-400 font-medium'}`}>Verify News</span>
          </div>
          
          <button onClick={() => setIsDark(!isDark)} className={`w-14 h-8 rounded-full border flex items-center px-1 transition-all ${isDark ? 'bg-blue-500 border-blue-400 justify-end' : 'bg-slate-200 border-slate-300 justify-start'}`}>
            <div className="w-6 h-6 bg-white rounded-full shadow-sm" />
          </button>
        </header>

        <section className="mb-20 sm:mb-32">
          <h1 className={`text-[3.5rem] leading-[1.1] sm:text-7xl md:text-[115px] font-bold tracking-tighter mb-10 sm:mb-16 ${isDark ? 'text-white' : 'text-slate-950'}`}>
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
                  placeholder="Paste an article URL..." 
                  className="w-full pl-6 pr-6 py-4 sm:px-8 outline-none font-medium text-lg sm:text-xl bg-transparent" 
                />
              </div>

              {data || status === 'limit' ? (
                <button 
                  onClick={handleClear} 
                  className={`w-full sm:w-auto h-[60px] sm:h-[68px] px-8 sm:px-12 rounded-2xl font-bold uppercase text-[14px] sm:text-[15px] tracking-[0.15em] transition-all active:scale-95 flex-shrink-0 ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}
                >
                  Clear
                </button>
              ) : (
                <button 
                  onClick={handleVerify} 
                  disabled={loading || !input} 
                  className={`w-full sm:w-auto h-[60px] sm:h-[68px] px-8 sm:px-12 rounded-2xl font-bold uppercase text-[14px] sm:text-[15px] tracking-[0.15em] transition-all active:scale-95 flex-shrink-0 ${isDark ? 'bg-blue-500 text-white hover:bg-blue-400 disabled:bg-blue-500/50' : 'bg-slate-950 text-white hover:bg-blue-500 disabled:bg-slate-400'}`}
                >
                  {loading ? 'Analyzing...' : 'Verify'}
                </button>
              )}
            </div>

            <p className={`mt-4 sm:mt-5 text-center text-[11px] sm:text-[12px] font-medium tracking-wide ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
              Verify News can make mistakes. Always check critical information.
            </p>

            {status === 'limit' && (
              <div className={`mt-8 p-6 sm:p-8 rounded-[1.5rem] border animate-in fade-in slide-in-from-top-4 duration-700 ${isDark ? 'bg-amber-500/10 border-amber-500/20 text-amber-200' : 'bg-amber-50 border-amber-200 text-amber-800 shadow-sm'}`}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6">
                  <span className="text-3xl">🪫</span>
                  <div>
                    <span className="block font-bold mb-1 uppercase tracking-wider text-[11px] opacity-80">Daily Limit Reached</span>
                    <p className="text-[14px] sm:text-[15px] font-medium leading-relaxed">We've hit our free AI request quota for the day! Please try again tomorrow when the limits reset at midnight Pacific Time.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {data && status !== 'limit' && (
          <div className="grid grid-cols-12 gap-8 sm:gap-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="col-span-12 lg:col-span-4 h-fit lg:sticky lg:top-12">
              <div className={`p-8 sm:p-12 rounded-[1.5rem] sm:rounded-3xl border transition-all ${isDark ? 'bg-[#151517] border-white/5' : 'bg-white border-slate-100 shadow-sm shadow-blue-500/[0.02]'}`}>
                <span className="text-[11px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em]">Trust Magnitude</span>
                <div className={`mt-8 sm:mt-10 text-[100px] sm:text-[140px] font-bold leading-none tracking-tighter transition-colors duration-1000 ${
                  data.score > 70 ? 'text-blue-500' : 
                  data.score > 40 ? 'text-amber-500' : 
                  'text-rose-600'
                }`}>
                  {data.score}
                </div>
                <div className="mt-8 sm:mt-12 space-y-5 sm:space-y-6">
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <div className={`h-full transition-all duration-[2s] ${
                      data.score > 70 ? 'bg-blue-500' : 
                      data.score > 40 ? 'bg-amber-400' : 
                      'bg-rose-500'
                    }`} style={{ width: `${data.score}%` }} />
                  </div>
                  <span className={`inline-block text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.15em] px-6 sm:px-8 py-2.5 rounded-xl ${
                    data.score > 70 ? 'bg-blue-500/10 text-blue-500' : 
                    data.score > 40 ? 'bg-amber-500/10 text-amber-500' : 
                    'bg-rose-500/10 text-rose-500'
                  }`}>
                    {data.sentiment}
                  </span>
                </div>
              </div>
            </div>
            
            <div className={`col-span-12 lg:col-span-8 p-6 sm:p-8 md:p-16 rounded-[1.5rem] sm:rounded-3xl border transition-all backdrop-blur-sm ${
              isDark ? 'bg-white/[0.01] border-white/5' : 'bg-white/30 border-white shadow-sm shadow-slate-200/20'
            }`}>
              {renderParsedAnalysis(data.analysis)}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}