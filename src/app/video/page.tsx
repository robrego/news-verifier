'use client';

import { useState, useEffect } from 'react';
import { fetchYouTubeTranscript, summarizeAndExtractClaims, searchBraveForClaims, generateFinalVerdict } from '../actions/verifyVideo';
import { Space_Grotesk } from 'next/font/google';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export default function VideoDeepDive() {
  const [url, setUrl] = useState('');
  const [step, setStep] = useState(0); 
  const [error, setError] = useState('');
  
  const [summary, setSummary] = useState('');
  const [claims, setClaims] = useState<string[]>([]);
  const [finalData, setFinalData] = useState<{ score: number; sentiment: string; analysis: string } | null>(null);
  
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  const handleDeepDive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setError(''); setSummary(''); setClaims([]); setFinalData(null); setStep(1); 

    const transcriptResponse = await fetchYouTubeTranscript(url);
    if (!transcriptResponse.success || !transcriptResponse.text) {
      setError(transcriptResponse.error || 'Failed to extract transcript.');
      setStep(-1); return;
    }

    setStep(2); 

    const agent1Response = await summarizeAndExtractClaims(transcriptResponse.text);
    if (!agent1Response.success || !agent1Response.data) {
      setError(agent1Response.error || 'Agent 1 failed to analyze the text.');
      setStep(-1); return;
    }

    setSummary(agent1Response.data.summary);
    setClaims(agent1Response.data.claims);
    setStep(3); 

    const agent2Response = await searchBraveForClaims(agent1Response.data.claims);
    if (!agent2Response.success || !agent2Response.evidence) {
      setError(agent2Response.error || 'Agent 2 failed to search the web.');
      setStep(-1); return;
    }

    setStep(4); 

    const agent3Response = await generateFinalVerdict(
      agent1Response.data.summary, 
      agent1Response.data.claims, 
      agent2Response.evidence
    );
    
    if (!agent3Response.success || !agent3Response.analysis) {
      setError(agent3Response.error || 'Agent 3 failed to generate verdict.');
      setStep(-1); return;
    }

    const resultText = agent3Response.analysis;
    const scoreMatch = resultText.match(/Trust Score:\s*(\d+)/i);
    const extractedScore = scoreMatch ? parseInt(scoreMatch[1], 10) : 50;

    let sentiment = "Analyzed";
    if (extractedScore > 75) sentiment = "Verified";
    else if (extractedScore < 40) sentiment = "Suspicious";

    setFinalData({
      score: extractedScore,
      sentiment: sentiment,
      analysis: resultText
    });
    
    setStep(5); 
  };

  const handleClear = () => {
    setUrl(''); setStep(0); setSummary(''); setClaims([]); setFinalData(null); setError('');
  };

  const formatSentences = (rawText: string) => {
    if (!rawText) return null;
    const sentences = rawText.split(/\.\s+/);
    return sentences.map((sentence, index) => {
      const isLast = index === sentences.length - 1;
      const displaySentence = isLast ? sentence : `${sentence}.`;
      return (
        <span key={index} className="block mb-4 last:mb-0">
          {displaySentence}
        </span>
      );
    });
  };

  const renderParsedAnalysis = (text: string) => {
    if (!text) return null;
    const sections = text.replace(/Trust Score[:\s*]*\d+/gi, '').split(/\*\*(.*?)\*\*/g);
    const introSummary = sections[0].trim();
    const coreAnalysis = sections.slice(1);

    return (
      <div className="grid grid-cols-12 gap-y-0">
        {introSummary && (
          <div className={`col-span-12 mb-10 pb-10 border-b ${isDark ? 'border-white/10' : 'border-slate-100'}`}>
             <h4 className="text-[12px] font-bold uppercase tracking-[0.2em] text-purple-500 mb-5">Agent 1: Video Summary</h4>
             <p className={`text-xl font-medium leading-relaxed italic pr-0 sm:pr-6 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
               "{formatSentences(introSummary)}"
             </p>
          </div>
        )}

        {coreAnalysis.map((part, i) => {
          if (i % 2 === 0) {
            const title = part.replace(/[:*]/g, '').trim();
            const lower = title.toLowerCase();
            let icon = "○"; let color = isDark ? "text-slate-500" : "text-slate-400";
            
            if (lower.includes('fallacy') || lower.includes('quotes')) { icon = "⚠️"; color = "text-rose-500"; }
            else if (lower.includes('consensus')) { icon = "✓"; color = "text-blue-500"; }
            else if (lower.includes('evidence')) { icon = "📊"; color = "text-amber-500"; }
            else if (lower.includes('verdict')) { icon = "⚖️"; color = "text-blue-500"; }

            return (
              <div key={i} className="col-span-12 mt-10 sm:mt-14 mb-6 sm:mb-8 flex items-center gap-4 sm:gap-5">
                <span className={`w-10 h-10 flex-shrink-0 rounded-xl flex items-center justify-center text-lg border ${isDark ? 'bg-white/5 border-white/10' : 'bg-white border-slate-100'} ${color}`}>{icon}</span>
                <h3 className={`font-bold text-[11px] sm:text-[12px] uppercase tracking-[0.2em] ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{title}</h3>
                <div className={`flex-grow h-[1px] ${isDark ? 'bg-white/5' : 'bg-slate-100'}`}></div>
              </div>
            );
          }

          const bullets = part.trim().split(/[\n•]+|\*(?=\s)/).map(b => b.replace(/^[•\-\*]\s*/, '').trim()).filter(b => b.length > 0);          
          
          return (
            <div key={i} className={`col-span-12 grid grid-cols-1 gap-6`}>
              {bullets.map((bullet, idx) => {
                const content = bullet.trim();
                
                // 1. Check for Exact Quotes: "[Quote]" - [Analysis]
                const exactQuoteMatch = content.match(/^["“](.*?)["”]\s*[-–—]\s*(.*)/);
                
                if (exactQuoteMatch) {
                  const exactQuote = exactQuoteMatch[1];
                  const realityAnalysis = exactQuoteMatch[2];
                  
                  return (
                    <div key={idx} className={`p-6 sm:p-8 rounded-3xl border transition-all ${isDark ? 'bg-[#151517] border-white/5 shadow-xl shadow-black/50' : 'bg-white border-slate-200 shadow-xl shadow-slate-200/50'}`}>
                      
                      <div className={`relative p-6 sm:p-8 mb-6 rounded-2xl border ${isDark ? 'bg-[#1A1A1D] border-white/5' : 'bg-slate-50 border-slate-200/50'}`}>
                        <span className={`absolute top-4 left-4 text-5xl font-serif leading-none ${isDark ? 'text-purple-500/20' : 'text-purple-500/20'}`}>"</span>
                        <p className={`relative z-10 text-[1.1rem] sm:text-[1.2rem] leading-relaxed font-serif italic ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                          {exactQuote}
                        </p>
                      </div>
                      
                      <div className="flex items-start gap-4 sm:gap-5">
                        <div className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0 mt-2" />
                        <p className={`text-[1rem] sm:text-[1.05rem] leading-relaxed font-medium ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                          {formatSentences(realityAnalysis)}
                        </p>
                      </div>
                    </div>
                  );
                }

                // 2. Fallback for regular bullets
                const lowerContent = content.toLowerCase();
                const isNegative = lowerContent.includes('missing') || lowerContent.includes('incorrect') || lowerContent.includes('false') || lowerContent.includes('low');
                const isPositive = lowerContent.includes('verified') || lowerContent.includes('true') || lowerContent.includes('credible') || lowerContent.includes('high');

                const dotColor = isNegative ? 'bg-rose-500' : isPositive ? 'bg-blue-500' : 'bg-slate-400';
                const borderColor = isPositive ? (isDark ? 'border-blue-500/30' : 'border-blue-500/20') : (isNegative ? (isDark ? 'border-rose-500/20' : 'border-rose-500/10') : (isDark ? 'border-white/5' : 'border-slate-100'));

                return (
                  <div key={idx} className={`border p-6 sm:p-8 rounded-2xl transition-all ${isDark ? 'bg-white/[0.02]' : 'bg-white'} ${borderColor}`}>
                    <div className="flex items-start gap-4 sm:gap-5">
                      <div className={`w-2 h-2 rounded-full ${dotColor} flex-shrink-0 mt-2`} />
                      <p className={`text-[1rem] sm:text-[1.05rem] leading-relaxed ${isPositive ? 'font-medium' : 'font-normal'} ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {formatSentences(content)}
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
            <span className={`text-sm tracking-widest uppercase hidden sm:inline-block ${isDark ? 'text-white/60 font-light' : 'text-slate-400 font-medium'}`}>Video Deep Dive</span>
          </div>
          <button onClick={() => setIsDark(!isDark)} className={`w-14 h-8 rounded-full border flex items-center px-1 transition-all ${isDark ? 'bg-blue-500 border-blue-400 justify-end' : 'bg-slate-200 border-slate-300 justify-start'}`}>
            <div className="w-6 h-6 bg-white rounded-full shadow-sm" />
          </button>
        </header>

        <section className="mb-16">
          <h1 className={`text-[3.5rem] leading-[1.1] sm:text-7xl md:text-[90px] font-bold tracking-tighter mb-10 sm:mb-16 ${isDark ? 'text-white' : 'text-slate-950'}`}>
            Analyze <span className="bg-gradient-to-r from-purple-500 to-blue-500 bg-clip-text text-transparent pr-2">Video.</span>
          </h1>
          
          <div className="relative w-full max-w-4xl">
            <form onSubmit={handleDeepDive} className={`flex flex-col sm:flex-row items-center gap-3 sm:gap-0 p-3 sm:p-2.5 rounded-[2rem] sm:rounded-3xl border transition-all ${isDark ? 'bg-[#151517] border-white/10' : 'bg-white border-white shadow-xl shadow-blue-500/5'}`}>
              <div className="relative w-full flex-grow flex items-center">
                <input 
                  type="url" value={url} onChange={(e) => setUrl(e.target.value)} 
                  placeholder="Paste a YouTube link..." 
                  disabled={step > 0 && step < 5} required
                  className="w-full pl-6 pr-6 py-4 sm:px-8 outline-none font-medium text-lg sm:text-xl bg-transparent disabled:opacity-50" 
                />
              </div>

              {step === 5 || step === -1 ? (
                <button type="button" onClick={handleClear} className={`w-full sm:w-auto h-[60px] sm:h-[68px] px-8 sm:px-12 rounded-2xl font-bold uppercase text-[14px] sm:text-[15px] tracking-[0.15em] transition-all flex-shrink-0 ${isDark ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'}`}>
                  Clear
                </button>
              ) : (
                <button type="submit" disabled={step > 0 || !url} className={`w-full sm:w-auto h-[60px] sm:h-[68px] px-8 sm:px-12 rounded-2xl font-bold uppercase text-[14px] sm:text-[15px] tracking-[0.15em] transition-all flex-shrink-0 ${isDark ? 'bg-blue-500 text-white hover:bg-blue-400 disabled:bg-blue-500/50' : 'bg-slate-950 text-white hover:bg-blue-500 disabled:bg-slate-400'}`}>
                  {step > 0 ? 'Analyzing...' : 'Deep Dive'}
                </button>
              )}
            </form>
          </div>
        </section>

        {error && (
          <div className={`mt-8 p-6 sm:p-8 rounded-[1.5rem] border animate-in fade-in max-w-4xl ${isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800 shadow-sm'}`}>
            <span className="font-bold uppercase tracking-wider text-[11px] opacity-80">System Error</span>
            <p className="text-[14px] sm:text-[15px] font-medium mt-1">{error}</p>
          </div>
        )}

        {(step > 0 && step < 5) && (
          <div className={`max-w-4xl p-8 sm:p-12 rounded-[1.5rem] sm:rounded-3xl border transition-all animate-in fade-in ${isDark ? 'bg-[#151517] border-white/5' : 'bg-white border-slate-100 shadow-sm shadow-blue-500/[0.02]'}`}>
            <h3 className={`font-bold text-[12px] uppercase tracking-[0.2em] mb-8 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>AI Pipeline Active</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                {step === 1 ? <span className="animate-spin text-blue-500 text-xl">⏳</span> : <span className="text-blue-500 text-xl">✓</span>}
                <p className={`text-lg sm:text-xl font-medium ${step >= 1 ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-500' : 'text-slate-400')}`}>1. Extracting YouTube Transcript</p>
              </div>
              <div className="flex items-center gap-4">
                {step < 2 ? <span className="text-xl opacity-30">○</span> : step === 2 ? <span className="animate-spin text-purple-500 text-xl">🧠</span> : <span className="text-blue-500 text-xl">✓</span>}
                <p className={`text-lg sm:text-xl font-medium ${step >= 2 ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-600' : 'text-slate-300')}`}>2. Agent 1: Summarizing & Extracting Claims</p>
              </div>
              <div className="flex items-center gap-4">
                {step < 3 ? <span className="text-xl opacity-30">○</span> : step === 3 ? <span className="animate-spin text-amber-500 text-xl">🔎</span> : <span className="text-blue-500 text-xl">✓</span>}
                <p className={`text-lg sm:text-xl font-medium ${step >= 3 ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-600' : 'text-slate-300')}`}>3. Agent 2: Live Web Search via Brave</p>
              </div>
              <div className="flex items-center gap-4">
                {step < 4 ? <span className="text-xl opacity-30">○</span> : step === 4 ? <span className="animate-spin text-rose-500 text-xl">⚖️</span> : <span className="text-blue-500 text-xl">✓</span>}
                <p className={`text-lg sm:text-xl font-medium ${step >= 4 ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-600' : 'text-slate-300')}`}>4. Agent 3: Calculating Final Trust Score</p>
              </div>
            </div>
          </div>
        )}

        {step === 5 && finalData && (
          <div className="grid grid-cols-12 gap-8 sm:gap-10 animate-in fade-in slide-in-from-bottom-12 duration-1000">
            <div className="col-span-12 lg:col-span-4 h-fit lg:sticky lg:top-12">
              <div className={`p-8 sm:p-12 rounded-[1.5rem] sm:rounded-3xl border transition-all ${isDark ? 'bg-[#151517] border-white/5' : 'bg-white border-slate-100 shadow-sm shadow-blue-500/[0.02]'}`}>
                <span className="text-[11px] sm:text-[12px] font-bold text-slate-400 uppercase tracking-[0.2em]">Trust Magnitude</span>
                <div className={`mt-8 sm:mt-10 text-[100px] sm:text-[140px] font-bold leading-none tracking-tighter transition-colors duration-1000 ${
                  finalData.score > 70 ? 'text-blue-500' : finalData.score > 40 ? 'text-amber-500' : 'text-rose-600'
                }`}>
                  {finalData.score}
                </div>
                <div className="mt-8 sm:mt-12 space-y-5 sm:space-y-6">
                  <div className={`h-2 rounded-full overflow-hidden ${isDark ? 'bg-white/5' : 'bg-slate-50'}`}>
                    <div className={`h-full transition-all duration-[2s] ${
                      finalData.score > 70 ? 'bg-blue-500' : finalData.score > 40 ? 'bg-amber-400' : 'bg-rose-500'
                    }`} style={{ width: `${finalData.score}%` }} />
                  </div>
                  <span className={`inline-block text-[11px] sm:text-[12px] font-bold uppercase tracking-[0.15em] px-6 sm:px-8 py-2.5 rounded-xl ${
                    finalData.score > 70 ? 'bg-blue-500/10 text-blue-500' : finalData.score > 40 ? 'bg-amber-500/10 text-amber-500' : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {finalData.sentiment}
                  </span>
                </div>
              </div>
            </div>
            
            <div className={`col-span-12 lg:col-span-8 p-6 sm:p-8 md:p-16 rounded-[1.5rem] sm:rounded-3xl border transition-all backdrop-blur-sm ${
              isDark ? 'bg-gradient-to-br from-white/[0.04] to-transparent border-white/5' : 'bg-gradient-to-br from-white to-blue-50/30 border-white shadow-sm shadow-slate-200/20'
            }`}>
              {renderParsedAnalysis(finalData.analysis)}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}