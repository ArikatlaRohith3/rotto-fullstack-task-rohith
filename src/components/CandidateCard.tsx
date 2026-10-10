'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { CandidateSummary, SearchFilters, Shortlist } from '@/lib/types'
import { MapPin, Briefcase, Plus, Check, BookmarkPlus, X, Users, Mail, Copy, Loader2 } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  candidate: CandidateSummary
  shortlists: Shortlist[]
  shortlistedIn: string[]
  onAddToShortlist: (candidateId: string, shortlistId: string) => void
  onCreateShortlist: (name: string) => Promise<string | null>
  matchFilters?: SearchFilters
  onFindSimilar?: (id: string, name: string) => void
  token?: string
}

const seniorityColors: Record<string, string> = {
  junior: 'bg-blue-50 text-blue-700',
  mid: 'bg-indigo-50 text-indigo-700',
  senior: 'bg-purple-50 text-purple-700',
  staff: 'bg-violet-50 text-violet-700',
  lead: 'bg-fuchsia-50 text-fuchsia-700',
  principal: 'bg-pink-50 text-pink-700',
}

function computeMatchChips(candidate: CandidateSummary, filters: SearchFilters): string[] {
  const chips: string[] = []
  const skillsLower = candidate.skills.map((s) => s.toLowerCase())

  if (filters.skills?.length) {
    filters.skills.forEach((skill) => {
      if (skillsLower.includes(skill.toLowerCase())) chips.push(skill)
    })
  }
  if (filters.location && candidate.location_city?.toLowerCase().includes(filters.location.toLowerCase())) {
    chips.push(candidate.location_city!)
  }
  if (filters.seniority && candidate.seniority === filters.seniority) {
    chips.push(filters.seniority.charAt(0).toUpperCase() + filters.seniority.slice(1))
  }
  if (filters.open_to_work && candidate.open_to_work) {
    chips.push('Open to work')
  }
  if (
    filters.min_years_experience != null &&
    candidate.years_experience != null &&
    candidate.years_experience >= filters.min_years_experience
  ) {
    chips.push(`${candidate.years_experience}y exp`)
  }
  return chips
}

function OutreachModal({
  candidateId,
  candidateName,
  token,
  onClose,
}: {
  candidateId: string
  candidateName: string
  token: string
  onClose: () => void
}) {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [recruiterName, setRecruiterName] = useState('')
  const [companyName, setCompanyName] = useState('')
  const [regenCooldown, setRegenCooldown] = useState(false)

  async function draft() {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/people/${candidateId}/outreach`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ recruiterName: recruiterName || undefined, companyName: companyName || undefined }),
      })
      if (res.ok) {
        const data = await res.json() as { email: string }
        setEmail(data.email)
        setRegenCooldown(true)
        setTimeout(() => setRegenCooldown(false), 5000)
      } else {
        setError('Failed to generate email. Please try again.')
      }
    } catch {
      setError('Network error. Please check your connection.')
    } finally {
      setLoading(false)
    }
  }

  async function copy() {
    await navigator.clipboard.writeText(email)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-semibold text-slate-900">Draft outreach email</h3>
            <p className="text-xs text-slate-500 mt-0.5">to {candidateName}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition">
            <X size={18} />
          </button>
        </div>

        {!email && (
          <div className="space-y-3 mb-4">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Your name</label>
                <input
                  value={recruiterName}
                  onChange={(e) => setRecruiterName(e.target.value)}
                  placeholder="Alex Chen"
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
              <div>
                <label className="text-xs text-slate-500 mb-1 block">Company</label>
                <input
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="Acme Inc"
                  className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                />
              </div>
            </div>
            {error && (
              <p className="text-xs text-red-600 bg-red-50 border border-red-200 px-3 py-2 rounded-lg">{error}</p>
            )}
            <button
              onClick={draft}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition"
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Drafting with AI…
                </>
              ) : (
                <>
                  <Mail size={15} />
                  Generate email
                </>
              )}
            </button>
          </div>
        )}

        {email && (
          <div>
            <div className="bg-slate-50 rounded-xl p-4 text-sm text-slate-700 whitespace-pre-wrap leading-relaxed border border-slate-100 max-h-64 overflow-y-auto">
              {email}
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={copy}
                className="flex-1 flex items-center justify-center gap-2 py-2 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white rounded-lg transition"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                {copied ? 'Copied!' : 'Copy email'}
              </button>
              <button
                onClick={() => { setEmail(''); setError('') }}
                disabled={regenCooldown}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg transition"
                title={regenCooldown ? 'Wait a moment before regenerating' : 'Regenerate'}
              >
                {regenCooldown ? 'Wait…' : 'Regenerate'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function CandidateCard({
  candidate,
  shortlists,
  shortlistedIn,
  onAddToShortlist,
  onCreateShortlist,
  matchFilters,
  onFindSimilar,
  token,
}: Props) {
  const [showShortlistMenu, setShowShortlistMenu] = useState(false)
  const [newListName, setNewListName] = useState('')
  const [creating, setCreating] = useState(false)
  const [showOutreach, setShowOutreach] = useState(false)

  const isShortlisted = shortlistedIn.length > 0
  const location = [candidate.location_city, candidate.location_state].filter(Boolean).join(', ')
  const matchChips = matchFilters ? computeMatchChips(candidate, matchFilters) : []

  async function handleCreateAndAdd() {
    if (!newListName.trim()) return
    setCreating(true)
    const id = await onCreateShortlist(newListName.trim())
    if (id) {
      onAddToShortlist(candidate.id, id)
      setNewListName('')
      setShowShortlistMenu(false)
    }
    setCreating(false)
  }

  return (
    <>
      <div className="group bg-white rounded-xl border border-slate-200 p-4 hover:border-brand-200 hover:shadow-sm transition-all">
        <div className="flex gap-3">
          {/* Avatar */}
          <div className="shrink-0">
            {candidate.avatar_url ? (
              <Image
                src={candidate.avatar_url}
                alt={candidate.full_name}
                width={44}
                height={44}
                className="rounded-full object-cover"
                unoptimized
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-medium text-sm">
                {candidate.full_name.charAt(0)}
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <Link
                  href={`/candidates/${candidate.id}`}
                  className="font-semibold text-sm text-slate-900 hover:text-brand-600 transition truncate block"
                >
                  {candidate.full_name}
                </Link>
                <p className="text-xs text-slate-500 truncate mt-0.5">
                  {candidate.current_title}
                  {candidate.current_company && ` · ${candidate.current_company}`}
                </p>
              </div>

              {/* Action buttons */}
              <div className="flex items-center gap-1 shrink-0">
                {/* Outreach button */}
                {token && (
                  <button
                    onClick={() => setShowOutreach(true)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition"
                    title="Draft outreach email"
                  >
                    <Mail size={14} />
                  </button>
                )}

                {/* Find similar button */}
                {onFindSimilar && (
                  <button
                    onClick={() => onFindSimilar(candidate.id, candidate.full_name)}
                    className="p-1.5 rounded-lg text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100 transition"
                    title="Find more like this"
                  >
                    <Users size={14} />
                  </button>
                )}

                {/* Shortlist button */}
                <div className="relative">
                  <button
                    onClick={() => setShowShortlistMenu(!showShortlistMenu)}
                    className={clsx(
                      'p-1.5 rounded-lg transition',
                      isShortlisted
                        ? 'bg-brand-50 text-brand-600'
                        : 'text-slate-300 hover:text-slate-600 hover:bg-slate-100 opacity-0 group-hover:opacity-100'
                    )}
                    title="Add to shortlist"
                  >
                    {isShortlisted ? <Check size={14} /> : <BookmarkPlus size={14} />}
                  </button>

                  {showShortlistMenu && (
                    <div className="absolute right-0 top-8 z-20 bg-white rounded-xl shadow-lg border border-slate-200 p-2 w-52">
                      <div className="flex items-center justify-between mb-2 px-1">
                        <span className="text-xs font-semibold text-slate-700">Add to list</span>
                        <button onClick={() => setShowShortlistMenu(false)} className="text-slate-400 hover:text-slate-600">
                          <X size={12} />
                        </button>
                      </div>
                      {shortlists.length === 0 && (
                        <p className="text-xs text-slate-400 px-1 pb-1">No lists yet.</p>
                      )}
                      {shortlists.map((sl) => (
                        <button
                          key={sl.id}
                          onClick={() => { onAddToShortlist(candidate.id, sl.id); setShowShortlistMenu(false) }}
                          className={clsx(
                            'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition',
                            shortlistedIn.includes(sl.id)
                              ? 'bg-brand-50 text-brand-600'
                              : 'hover:bg-slate-50 text-slate-700'
                          )}
                        >
                          {shortlistedIn.includes(sl.id) ? <Check size={11} /> : <Plus size={11} />}
                          {sl.name}
                        </button>
                      ))}
                      <div className="mt-1 pt-1 border-t border-slate-100">
                        <div className="flex gap-1">
                          <input
                            value={newListName}
                            onChange={(e) => setNewListName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAdd()}
                            placeholder="New list…"
                            className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                          />
                          <button
                            onClick={handleCreateAndAdd}
                            disabled={creating || !newListName.trim()}
                            className="px-2 py-1.5 bg-brand-600 text-white text-xs rounded-lg disabled:opacity-40 transition hover:bg-brand-700"
                          >
                            <Plus size={11} />
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center flex-wrap gap-2 mt-2">
              {candidate.seniority && (
                <span className={clsx('text-xs px-2 py-0.5 rounded-full font-medium capitalize', seniorityColors[candidate.seniority] ?? 'bg-slate-100 text-slate-600')}>
                  {candidate.seniority}
                </span>
              )}
              {candidate.years_experience != null && (
                <span className="flex items-center gap-0.5 text-xs text-slate-500">
                  <Briefcase size={11} />
                  {candidate.years_experience}y
                </span>
              )}
              {location && (
                <span className="flex items-center gap-0.5 text-xs text-slate-500">
                  <MapPin size={11} />
                  {location}
                </span>
              )}
              {candidate.open_to_work && (
                <span className="text-xs text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">Open</span>
              )}
            </div>

            {/* Skills */}
            {candidate.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {candidate.skills.slice(0, 4).map((skill) => (
                  <span key={skill} className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full">
                    {skill}
                  </span>
                ))}
                {candidate.skills.length > 4 && (
                  <span className="text-xs text-slate-400">+{candidate.skills.length - 4}</span>
                )}
              </div>
            )}

            {/* Match explanation chips */}
            {matchChips.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-slate-50">
                {matchChips.map((chip) => (
                  <span key={chip} className="inline-flex items-center gap-0.5 text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium border border-emerald-100">
                    <Check size={10} />
                    {chip}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {showOutreach && token && (
        <OutreachModal
          candidateId={candidate.id}
          candidateName={candidate.full_name}
          token={token}
          onClose={() => setShowOutreach(false)}
        />
      )}
    </>
  )
}
