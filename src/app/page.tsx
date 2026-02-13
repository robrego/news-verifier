'use client'

import { useState } from 'react'
import { verifyNews } from './actions/verify'

export default function Home() {
  const [headline, setHeadline] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setResult('')
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
    <main className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-2xl border border-zinc-800 p-8 rounded-2xl bg-zinc-900 shadow-2xl">
        <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
          The Verifier
        </h1>
        <p className="text-zinc-400 mb-8 text-sm">Portfolio Project: AI News Integrity Tool</p>
        <form onSubmit={handleVerify} className="space-y-4">
          <textarea
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Paste a headline here..."
            className="w-full h-32 bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white focus:ring-1 focus:ring-blue-500 outline-none"
            required
          />
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 rounded-xl font-bold transition-all disabled:opacity-50"
          >
            {loading ? 'Analyzing...' : 'Verify Credibility'}
          </button>
        </form>
        {result && (
          <div className="mt-8 p-6 bg-zinc-950 border border-zinc-800 rounded-xl">
            <h3 className="text-xs font-bold text-zinc-500 uppercase tracking-widest mb-4">Analysis</h3>
            <p className="whitespace-pre-wrap text-zinc-300 text-sm leading-relaxed">{result}</p>
          </div>
        )}
      </div>
    </main>
  )
}