'use client'

import { useState, useEffect, useCallback } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Shortlist } from '@/lib/types'
import { X, Pencil, Trash2, Check, Plus, UserMinus, Loader2 } from 'lucide-react'

interface Candidate {
  id: string
  full_name: string
  avatar_url: string | null
  current_title: string | null
}

interface Props {
  shortlists: Shortlist[]
  token: string
  onUpdate: () => void
  onClose: () => void
}

export default function ShortlistPanel({ shortlists, token, onUpdate, onClose }: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [candidates, setCandidates] = useState<Candidate[]>([])
  const [loading, setLoading] = useState(false)
  const [editingName, setEditingName] = useState<string | null>(null)
  const [nameValue, setNameValue] = useState('')
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const authHeader = { Authorization: `Bearer ${token}` }

  const loadCandidates = useCallback(async (shortlistId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/shortlists/${shortlistId}/people`, { headers: authHeader })
      if (res.ok) setCandidates(await res.json())
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (selected) loadCandidates(selected)
    else setCandidates([])
  }, [selected, loadCandidates])

  async function handleCreate() {
    if (!newName.trim()) return
    setCreating(true)
    const res = await fetch('/api/shortlists', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    })
    if (res.ok) { onUpdate(); setNewName('') }
    setCreating(false)
  }

  async function handleRename(id: string) {
    const trimmed = nameValue.trim()
    if (!trimmed) { setEditingName(null); return }
    await fetch(`/api/shortlists/${id}`, {
      method: 'PATCH',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: trimmed }),
    })
    onUpdate()
    setEditingName(null)
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this shortlist?')) return
    await fetch(`/api/shortlists/${id}`, { method: 'DELETE', headers: authHeader })
    if (selected === id) setSelected(null)
    onUpdate()
  }

  async function handleRemoveCandidate(candidateId: string) {
    if (!selected) return
    await fetch(`/api/shortlists/${selected}/people/${candidateId}`, { method: 'DELETE', headers: authHeader })
    setCandidates((prev) => prev.filter((c) => c.id !== candidateId))
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h2 className="font-semibold text-sm text-slate-900">Shortlists</h2>
        <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
          <X size={15} />
        </button>
      </div>

      {/* Create new */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex gap-1.5">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="New list name…"
            className="flex-1 text-xs px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newName.trim()}
            className="px-2 py-2 bg-brand-600 text-white rounded-lg disabled:opacity-40 transition hover:bg-brand-700"
          >
            {creating ? <Loader2 size={12} className="animate-spin" /> : <Plus size={12} />}
          </button>
        </div>
      </div>

      {/* List of shortlists */}
      <div className="px-2 pb-2 max-h-40 overflow-y-auto scrollbar-thin">
        {shortlists.length === 0 && (
          <p className="text-xs text-slate-400 text-center py-4">No shortlists yet</p>
        )}
        {shortlists.map((sl) => (
          <div
            key={sl.id}
            className={`group flex items-center gap-2 px-2 py-2 rounded-lg cursor-pointer transition ${selected === sl.id ? 'bg-brand-50' : 'hover:bg-slate-50'}`}
            onClick={() => setSelected(selected === sl.id ? null : sl.id)}
          >
            {editingName === sl.id ? (
              <input
                autoFocus
                value={nameValue}
                onChange={(e) => setNameValue(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') handleRename(sl.id); if (e.key === 'Escape') setEditingName(null) }}
                onBlur={() => handleRename(sl.id)}
                onClick={(e) => e.stopPropagation()}
                className="flex-1 text-xs border-none outline-none bg-transparent"
              />
            ) : (
              <span className={`flex-1 text-xs font-medium truncate ${selected === sl.id ? 'text-brand-700' : 'text-slate-700'}`}>
                {sl.name}
              </span>
            )}
            <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition">
              <button onClick={(e) => { e.stopPropagation(); setEditingName(sl.id); setNameValue(sl.name) }} className="p-1 text-slate-400 hover:text-slate-600 rounded">
                <Pencil size={10} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); handleDelete(sl.id) }} className="p-1 text-slate-400 hover:text-red-600 rounded">
                <Trash2 size={10} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Selected shortlist candidates */}
      {selected && (
        <div className="border-t border-slate-100">
          <div className="px-4 py-2.5 flex items-center justify-between">
            <span className="text-xs font-medium text-slate-600">
              {shortlists.find((s) => s.id === selected)?.name}
            </span>
            <span className="text-xs text-slate-400">{candidates.length} people</span>
          </div>
          <div className="px-2 pb-3 max-h-64 overflow-y-auto scrollbar-thin">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader2 size={16} className="animate-spin text-brand-500" />
              </div>
            )}
            {!loading && candidates.length === 0 && (
              <p className="text-xs text-slate-400 text-center py-3">No candidates yet</p>
            )}
            {!loading && candidates.map((c) => (
              <div key={c.id} className="group flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition">
                {c.avatar_url ? (
                  <Image src={c.avatar_url} alt={c.full_name} width={24} height={24} className="rounded-full shrink-0" unoptimized />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-slate-200 flex items-center justify-center text-xs text-slate-500 shrink-0">
                    {c.full_name.charAt(0)}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <Link href={`/candidates/${c.id}`} className="text-xs font-medium text-slate-800 hover:text-brand-600 truncate block">
                    {c.full_name}
                  </Link>
                  {c.current_title && <p className="text-xs text-slate-400 truncate">{c.current_title}</p>}
                </div>
                <button
                  onClick={() => handleRemoveCandidate(c.id)}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-500 rounded transition"
                  title="Remove"
                >
                  <UserMinus size={11} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
