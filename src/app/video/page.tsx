'use client';

import { useState, useEffect } from 'react';
import { fetchYouTubeTranscript, summarizeAndExtractClaims, searchBraveForClaims, generateFinalVerdict } from '../actions/verifyVideo';
import { Space_Grotesk } from 'next/font/google';
import Link from 'next/link';

const spaceGrotesk = Space_Grotesk({ subsets: ['latin'] });

export default function VideoDeepDive() {
  const [url, setUrl] = useState('');
  const [manualText, setManualText] = useState(''); // 🚀 NEW: State for manual override
  const [step, setStep] = useState(0); 
  const [error, setError] = useState('');
  
  const [summary, setSummary] = useState('');
  const [claims, setClaims] = useState<string[]>([]);
  const [finalData, setFinalData] = useState<{ score: number; sentiment: string; analysis: string } | null>(null);
  
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // The Standard Pipeline
  const handleDeepDive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!url) return;
    
    setError(''); setSummary(''); setClaims([]); setFinalData(null); setManualText(''); setStep(1); 

    const transcriptResponse = await fetchYouTubeTranscript(url);
    if (!transcriptResponse.success || !transcriptResponse.text) {
      setError(transcriptResponse.error || 'Failed to extract transcript.');
      setStep(-1); return;
    }

    await runAgents(transcriptResponse.text);
  };

  // 🚀 NEW: The Manual Override Pipeline (Jumps straight to Agent 1)
  const handleManualDeepDive = async () => {
    if (!manualText) return;
    setError('');
    setStep(2); 
    await runAgents(manualText);
  };

  // Helper function to run Agents 1, 2, and 3 so we don't repeat code
  const runAgents = async (transcriptData: string) => {
    setStep(2); 
    const agent1Response = await summarizeAndExtractClaims(transcriptData);
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
    setUrl(''); setStep(0); setSummary(''); setClaims([]); setFinalData(null); setError(''); setManualText('');
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
             <h4 className="text-[12px] font-bold uppercase tracking-[0.2em] text-purple-500 mb-5">Video Summary</h4>
             <p className={`text-xl font-medium leading-relaxed italic pr-0 sm:pr-6 ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
               "{formatSentences(introSummary)}"
             </p>
          </div>
        )}

        {coreAnalysis.map((part, i) => {
          if (i % 2 === 0) {
            let title = part.replace(/[:*]/g, '').trim();
            const lower = title.toLowerCase();
            let icon = "○"; let color = isDark ? "text-slate-500" : "text-slate-400";
            
            // Rewrite the titles on the fly for better UX
            if (lower.includes('fallacy') || lower.includes('quotes')) { 
                title = "Verified Quotes";
                icon = "🎯"; color = "text-rose-500"; 
            }
            else if (lower.includes('consensus')) { 
                title = "Factual Context";
                icon = "⚖️"; color = "text-blue-500"; 
            }
            else if (lower.includes('evidence')) { 
                title = "Supporting Research";
                icon = "📚"; color = "text-amber-500"; 
            }
            else if (lower.includes('verdict')) { 
                title = "Final Determination";
                icon = "🏁"; color = "text-blue-500"; 
            }

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
        <div className="flex items-center justify-between mb-20 sm:mb-32">
        {/* Left: Status Badge */}
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-bold uppercase tracking-widest transition-all ${isDark ? 'bg-white/5 border-white/10 text-slate-400' : 'bg-slate-50 border-slate-200 text-slate-500'}`}>
         <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Video Deep Dive
       </div>

        {/* Right: Nav + Mini Switch */}
        <div className="flex items-center gap-10">
          <nav className="flex gap-8">
         {/* News Link - Now the faded one */}
        <Link href="/" className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${isDark ? 'text-slate-600 hover:text-slate-400' : 'text-slate-300 hover:text-slate-500'}`}>
         News
        </Link>

        {/* Videos Link - Now the active one */}
        <Link href="/video" className={`text-[10px] uppercase tracking-[0.2em] font-bold transition-all ${isDark ? 'text-white' : 'text-purple-600'}`}>
         Videos
          </Link>
    </nav>

    <button onClick={() => setIsDark(!isDark)} className={`relative flex items-center w-10 h-5 rounded-full border transition-all duration-500 ${isDark ? 'bg-zinc-800 border-white/10' : 'bg-slate-100 border-slate-300'}`}>
      <div className={`absolute w-3.5 h-3.5 rounded-full transition-all duration-300 shadow-sm ${isDark ? 'translate-x-5.5 bg-blue-500' : 'translate-x-1 bg-white'}`} />
    </button>
  </div>
</div>
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

        {/* 🚀 NEW: The Manual Override Box */}
        {error && (
          <div className={`mt-8 p-6 sm:p-8 rounded-[1.5rem] border animate-in fade-in max-w-4xl ${isDark ? 'bg-rose-500/10 border-rose-500/20 text-rose-200' : 'bg-rose-50 border-rose-200 text-rose-800 shadow-sm'}`}>
            <span className="font-bold uppercase tracking-wider text-[11px] opacity-80 flex items-center gap-2">
              ⚠️ Anti-Bot Protection Triggered
            </span>
            <p className="text-[14px] sm:text-[15px] font-medium mt-3 mb-5 leading-relaxed">
              YouTube blocked our cloud server from reading this video. <strong>But you can bypass this!</strong> Open the YouTube video, click "Show Transcript", copy the text, and paste it below:
            </p>
            <textarea 
               className={`w-full p-5 rounded-xl border text-[14px] h-32 outline-none font-mono transition-all ${isDark ? 'bg-black/20 border-rose-500/30 text-slate-300 focus:border-rose-400' : 'bg-white border-rose-200 focus:border-rose-400 text-slate-700'}`}
               placeholder="Paste the raw YouTube transcript text here..."
               value={manualText}
               onChange={(e) => setManualText(e.target.value)}
            />
            <button 
              onClick={handleManualDeepDive} 
              disabled={!manualText}
              className={`mt-5 px-8 py-4 rounded-xl font-bold uppercase text-[13px] tracking-[0.15em] transition-all disabled:opacity-50 ${isDark ? 'bg-rose-500 text-white hover:bg-rose-400' : 'bg-rose-600 text-white hover:bg-rose-500'}`}
            >
              Bypass & Analyze
            </button>
          </div>
        )}

{(step > 0 && step < 5) && (
          <div className={`max-w-4xl p-8 sm:p-12 rounded-[1.5rem] sm:rounded-3xl border transition-all animate-in fade-in ${isDark ? 'bg-[#151517] border-white/5' : 'bg-white border-slate-100 shadow-sm shadow-blue-500/[0.02]'}`}>
            <h3 className={`font-bold text-[12px] uppercase tracking-[0.2em] mb-10 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>Intelligence Engine Active</h3>
            <div className="space-y-8">
              <div className="flex items-center gap-5">
                {step === 1 ? <span className="animate-pulse w-3 h-3 rounded-full bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]" /> : <span className="text-blue-500 text-xl">✓</span>}
                <p className={`text-lg sm:text-xl font-medium tracking-tight ${step >= 1 ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-600' : 'text-slate-300')}`}>Ingesting and parsing video metadata</p>
              </div>
              <div className="flex items-center gap-5">
                {step < 2 ? <span className="w-3 h-3 rounded-full border border-slate-300 opacity-30" /> : step === 2 ? <span className="animate-pulse w-3 h-3 rounded-full bg-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.5)]" /> : <span className="text-blue-500 text-xl">✓</span>}
                <p className={`text-lg sm:text-xl font-medium tracking-tight ${step >= 2 ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-600' : 'text-slate-300')}`}>Identifying core claims and verbatim quotes</p>
              </div>
              <div className="flex items-center gap-5">
                {step < 3 ? <span className="w-3 h-3 rounded-full border border-slate-300 opacity-30" /> : step === 3 ? <span className="animate-pulse w-3 h-3 rounded-full bg-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]" /> : <span className="text-blue-500 text-xl">✓</span>}
                <p className={`text-lg sm:text-xl font-medium tracking-tight ${step >= 3 ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-600' : 'text-slate-300')}`}>Cross-referencing live global research data</p>
              </div>
              <div className="flex items-center gap-5">
                {step < 4 ? <span className="w-3 h-3 rounded-full border border-slate-300 opacity-30" /> : step === 4 ? <span className="animate-pulse w-3 h-3 rounded-full bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]" /> : <span className="text-blue-500 text-xl">✓</span>}
                <p className={`text-lg sm:text-xl font-medium tracking-tight ${step >= 4 ? (isDark ? 'text-white' : 'text-slate-900') : (isDark ? 'text-slate-600' : 'text-slate-300')}`}>Synthesizing final credibility magnitude</p>
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