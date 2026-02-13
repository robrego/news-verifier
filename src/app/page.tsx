'use client'

import { useState, useEffect } from 'react'
import { verifyNews } from './actions/verify'

// Helper function to extract trust score from result
function extractTrustScore(result: string): number | null {
  const match = result.match(/(?:Trust Score|Score)[:\s]*(\d+)/i);
  return match ? parseInt(match[1], 10) : null;
}

// Helper function to get color based on trust score
function getTrustColor(score: number): string {
  if (score >= 70) return 'from-emerald-500 to-green-400';
  if (score >= 40) return 'from-yellow-500 to-orange-400';
  return 'from-red-500 to-rose-400';
}

export default function Home() {
  const [headline, setHeadline] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [trustScore, setTrustScore] = useState<number | null>(null)

  useEffect(() => {
    if (result) {
      const score = extractTrustScore(result);
      setTrustScore(score);
    } else {
      setTrustScore(null);
    }
  }, [result])

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult('')
    setTrustScore(null)
    try {
      const report = await verifyNews(headline)
      setResult(report)
    } catch (error) {
      setResult("Error: Ensure your API key is in .env.local.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-900 via-black to-slate-900 text-white flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl"></div>
      </div>

      <div className="relative w-full max-w-3xl z-10">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-3 bg-gradient-to-r from-blue-400 via-cyan-400 to-emerald-400 bg-clip-text text-transparent drop-shadow-2xl">
            The Verifier
          </h1>
          <p className="text-slate-400 text-sm font-medium tracking-wider uppercase">Professional News Integrity Analysis</p>
        </div>

        {/* Glassmorphism Input Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl mb-6">
          <form onSubmit={handleVerify} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-2">
                Enter Headline or Article URL
              </label>
              <textarea
                value={headline}
                onChange={(e) => setHeadline(e.target.value)}
                placeholder="Paste a headline or article URL here..."
                className="w-full h-40 bg-black/30 backdrop-blur-sm border border-white/20 rounded-2xl p-5 text-white placeholder:text-slate-500 focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 outline-none transition-all resize-none"
                required
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 rounded-2xl font-bold text-lg shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing...
                </span>
              ) : (
                'Verify Credibility'
              )}
            </button>
          </form>
        </div>

        {/* Trust Meter Gauge */}
        {trustScore !== null && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl mb-6">
            <div className="mb-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-bold text-slate-200">Trust Score</h3>
                <span className={`text-3xl font-extrabold bg-gradient-to-r ${getTrustColor(trustScore)} bg-clip-text text-transparent`}>
                  {trustScore}%
                </span>
              </div>
              <div className="w-full h-4 bg-black/30 rounded-full overflow-hidden">
                <div
                  className={`h-full bg-gradient-to-r ${getTrustColor(trustScore)} transition-all duration-1000 ease-out rounded-full shadow-lg`}
                  style={{ width: `${trustScore}%` }}
                ></div>
              </div>
            </div>
          </div>
        )}

        {/* Results Card */}
        {result && (
          <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
              <span className="w-1 h-1 bg-blue-400 rounded-full"></span>
              Forensic Analysis
            </h3>
            <div className="prose prose-invert max-w-none">
              <p className="whitespace-pre-wrap text-slate-200 text-sm leading-relaxed font-medium">
                {result}
              </p>
            </div>
          </div>
        )}
      </div>
    </main>
  )
}