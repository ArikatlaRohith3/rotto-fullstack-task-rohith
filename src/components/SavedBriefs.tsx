'use client'

import { SavedBrief } from '@/lib/types'
import { X, Play, Trash2, Clock } from 'lucide-react'

interface Props {
  briefs: SavedBrief[]
  token: string
  onRun: (brief: SavedBrief) => void
  onRefresh: () => void
  onClose: () => void
}

export default function SavedBriefs({ briefs, token, onRun, onRefresh, onClose }: Props) {
  const authHeader = { Authorization: `Bearer ${token}` }

  async function handleDelete(id: string) {
    await fetch(`/api/saved-briefs/${id}`, { method: 'DELETE', headers: authHeader })
    onRefresh()
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h2 className="font-semibold text-sm text-slate-900">Saved searches</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
          <X size={15} />
        </button>
      </div>

      <div className="max-h-96 overflow-y-auto scrollbar-thin">
        {briefs.length === 0 && (
          <div className="py-8 text-center">
            <Clock size={20} className="mx-auto text-slate-300 mb-2" />
            <p className="text-xs text-slate-400">No saved searches yet</p>
            <p className="text-xs text-slate-300 mt-0.5">Click Save after a search</p>
          </div>
        )}
        {briefs.map((brief) => (
          <div key={brief.id} className="group flex items-start gap-2 px-3 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-slate-800 line-clamp-2 leading-relaxed">{brief.brief}</p>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(brief.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
              </p>
            </div>
            <div className="flex gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition">
              <button
                onClick={() => onRun(brief)}
                className="p-1.5 text-brand-500 hover:text-brand-700 hover:bg-brand-50 rounded-lg transition"
                title="Re-run search"
              >
                <Play size={12} />
              </button>
              <button
                onClick={() => handleDelete(brief.id)}
                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
                title="Delete"
              >
                <Trash2 size={12} />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
