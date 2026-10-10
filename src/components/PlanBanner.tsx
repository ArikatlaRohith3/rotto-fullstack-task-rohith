'use client'

import { Zap, AlertCircle } from 'lucide-react'

interface Props {
  plan: 'free' | 'paid'
  searchesRemaining: number | null
  onUpgrade?: () => void
}

export default function PlanBanner({ plan, searchesRemaining, onUpgrade }: Props) {
  if (plan === 'paid') return null

  if (searchesRemaining === null || searchesRemaining > 0) {
    return (
      <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
        <Zap size={13} className="shrink-0 text-amber-500" />
        <span>
          Free plan — <strong>{searchesRemaining ?? 1} search remaining</strong>.
          Upgrade for unlimited searches.
        </span>
        <button
          onClick={onUpgrade}
          className="ml-auto font-medium underline text-amber-700 hover:text-amber-900 shrink-0"
        >
          Upgrade
        </button>
      </div>
    )
  }

  return (
    <div className="mb-4 flex items-center gap-2 px-3 py-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-800">
      <AlertCircle size={13} className="shrink-0 text-red-500" />
      <span>
        You&apos;ve used your free search. <strong>Upgrade to continue.</strong>
      </span>
      <button
        onClick={onUpgrade}
        className="ml-auto font-medium underline text-red-700 hover:text-red-900 shrink-0"
      >
        Upgrade — $49/mo
      </button>
    </div>
  )
}
