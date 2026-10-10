'use client'

import { X, Zap, Check, Loader2 } from 'lucide-react'
import { useState } from 'react'

interface Props {
  onClose: () => void
  token: string
}

const FREE_FEATURES = ['1 search per account', 'Up to 20 results per search', 'Shortlists & saved searches', 'Outreach email drafter', 'Find Similar (pgvector)']
const PRO_FEATURES = ['Unlimited searches', 'Up to 20 results per search', 'Shortlists & saved searches', 'Outreach email drafter', 'Find Similar (pgvector)', 'Priority support']

export default function UpgradeModal({ onClose, token }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleUpgrade() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
      const data = await res.json() as { url?: string; error?: string; demo?: boolean }
      if (data.url) {
        window.location.href = data.url
      } else if (data.demo) {
        setError('Stripe is not configured in this demo. In production this would redirect to checkout.')
        setLoading(false)
      } else {
        setError(data.error ?? 'Something went wrong.')
        setLoading(false)
      }
    } catch {
      setError('Network error. Please try again.')
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-5">
          <div>
            <h3 className="font-semibold text-slate-900 text-lg">Upgrade to Pro</h3>
            <p className="text-xs text-slate-500 mt-0.5">Unlock unlimited searches</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-5">
          {/* Free */}
          <div className="border border-slate-200 rounded-xl p-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Free</p>
            <p className="text-2xl font-bold text-slate-900 mb-3">$0</p>
            <ul className="space-y-1.5">
              {FREE_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs text-slate-500">
                  <Check size={11} className="mt-0.5 shrink-0 text-slate-300" />
                  {f}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro */}
          <div className="border-2 border-brand-500 rounded-xl p-4 relative">
            <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-brand-500 text-white text-xs font-semibold px-2 py-0.5 rounded-full">
              Recommended
            </span>
            <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide mb-1">Pro</p>
            <p className="text-2xl font-bold text-slate-900 mb-3">
              $49<span className="text-sm font-normal text-slate-400">/mo</span>
            </p>
            <ul className="space-y-1.5">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-1.5 text-xs text-slate-700">
                  <Check size={11} className="mt-0.5 shrink-0 text-brand-500" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {error && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg mb-3">
            {error}
          </p>
        )}

        <button
          onClick={handleUpgrade}
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-medium text-sm rounded-xl transition"
        >
          {loading ? (
            <><Loader2 size={15} className="animate-spin" /> Processing…</>
          ) : (
            <><Zap size={15} /> Upgrade to Pro — $49/mo</>
          )}
        </button>

        <p className="text-center text-xs text-slate-400 mt-3">Cancel anytime. Billed monthly.</p>
      </div>
    </div>
  )
}
