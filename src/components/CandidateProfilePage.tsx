'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { Candidate, Shortlist } from '@/lib/types'
import { ArrowLeft, MapPin, Briefcase, GraduationCap, BookmarkPlus, Check, Loader2, Plus, X } from 'lucide-react'
import { clsx } from 'clsx'

interface Props {
  candidateId: string
  token: string
}

const seniorityColors: Record<string, string> = {
  junior: 'bg-blue-50 text-blue-700',
  mid: 'bg-indigo-50 text-indigo-700',
  senior: 'bg-purple-50 text-purple-700',
  staff: 'bg-violet-50 text-violet-700',
  lead: 'bg-fuchsia-50 text-fuchsia-700',
  principal: 'bg-pink-50 text-pink-700',
}

export default function CandidateProfilePage({ candidateId, token }: Props) {
  const [candidate, setCandidate] = useState<Candidate | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [shortlists, setShortlists] = useState<Shortlist[]>([])
  const [shortlistedIn, setShortlistedIn] = useState<string[]>([])
  const [showShortlistMenu, setShowShortlistMenu] = useState(false)
  const [newListName, setNewListName] = useState('')

  const authHeader = { Authorization: `Bearer ${token}` }

  useEffect(() => {
    async function load() {
      try {
        const [candRes, slRes] = await Promise.all([
          fetch(`/api/people/${candidateId}`, { headers: authHeader }),
          fetch('/api/shortlists', { headers: authHeader }),
        ])
        if (!candRes.ok) { setError('Candidate not found'); return }
        setCandidate(await candRes.json())
        if (slRes.ok) setShortlists(await slRes.json())
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [candidateId, token])

  async function handleAddToShortlist(shortlistId: string) {
    await fetch(`/api/shortlists/${shortlistId}/people/${candidateId}`, {
      method: 'POST',
      headers: authHeader,
    })
    setShortlistedIn((prev) => [...prev.filter((id) => id !== shortlistId), shortlistId])
    setShowShortlistMenu(false)
  }

  async function handleCreateAndAdd() {
    if (!newListName.trim()) return
    const res = await fetch('/api/shortlists', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newListName.trim() }),
    })
    if (res.ok) {
      const sl = await res.json()
      setShortlists((prev) => [sl, ...prev])
      await handleAddToShortlist(sl.id)
      setNewListName('')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-brand-500" size={24} />
      </div>
    )
  }

  if (error || !candidate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600 mb-4">{error || 'Candidate not found'}</p>
          <Link href="/search" className="text-brand-600 hover:underline text-sm">Back to search</Link>
        </div>
      </div>
    )
  }

  const location = [candidate.location_city, candidate.location_state, candidate.location_country].filter(Boolean).join(', ')
  const isShortlisted = shortlistedIn.length > 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link href="/search" className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-slate-900 transition">
            <ArrowLeft size={16} />
            Back to search
          </Link>
          <div className="relative">
            <button
              onClick={() => setShowShortlistMenu(!showShortlistMenu)}
              className={clsx(
                'flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium transition',
                isShortlisted
                  ? 'bg-brand-600 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              )}
            >
              {isShortlisted ? <Check size={14} /> : <BookmarkPlus size={14} />}
              {isShortlisted ? 'Shortlisted' : 'Add to list'}
            </button>

            {showShortlistMenu && (
              <div className="absolute right-0 top-10 z-20 bg-white rounded-xl shadow-lg border border-slate-200 p-2 w-52">
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <span className="text-xs font-semibold text-slate-700">Add to list</span>
                  <button onClick={() => setShowShortlistMenu(false)} className="text-slate-400">
                    <X size={12} />
                  </button>
                </div>
                {shortlists.map((sl) => (
                  <button
                    key={sl.id}
                    onClick={() => handleAddToShortlist(sl.id)}
                    className={clsx(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs text-left transition',
                      shortlistedIn.includes(sl.id)
                        ? 'bg-brand-50 text-brand-700'
                        : 'hover:bg-slate-50 text-slate-700'
                    )}
                  >
                    {shortlistedIn.includes(sl.id) ? <Check size={11} /> : <Plus size={11} />}
                    {sl.name}
                  </button>
                ))}
                <div className="mt-1 pt-1 border-t border-slate-100 flex gap-1">
                  <input
                    value={newListName}
                    onChange={(e) => setNewListName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateAndAdd()}
                    placeholder="New list…"
                    className="flex-1 text-xs px-2 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400"
                  />
                  <button
                    onClick={handleCreateAndAdd}
                    disabled={!newListName.trim()}
                    className="px-2 py-1.5 bg-brand-600 text-white text-xs rounded-lg disabled:opacity-40 hover:bg-brand-700"
                  >
                    <Plus size={11} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8">
        {/* Header card */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
          <div className="flex items-start gap-5">
            {candidate.avatar_url ? (
              <Image
                src={candidate.avatar_url}
                alt={candidate.full_name}
                width={72}
                height={72}
                className="rounded-2xl object-cover shrink-0"
                unoptimized
              />
            ) : (
              <div className="w-18 h-18 rounded-2xl bg-slate-200 flex items-center justify-center text-2xl font-semibold text-slate-500 shrink-0">
                {candidate.full_name.charAt(0)}
              </div>
            )}

            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-slate-900">{candidate.full_name}</h1>
              {candidate.headline && <p className="text-sm text-slate-500 mt-0.5">{candidate.headline}</p>}

              <div className="flex flex-wrap items-center gap-3 mt-3">
                {candidate.seniority && (
                  <span className={clsx('text-xs px-2.5 py-1 rounded-full font-medium capitalize', seniorityColors[candidate.seniority] ?? 'bg-slate-100 text-slate-600')}>
                    {candidate.seniority}
                  </span>
                )}
                {location && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <MapPin size={12} /> {location}
                  </span>
                )}
                {candidate.years_experience != null && (
                  <span className="flex items-center gap-1 text-xs text-slate-500">
                    <Briefcase size={12} /> {candidate.years_experience} years exp.
                  </span>
                )}
                {candidate.open_to_work && (
                  <span className="text-xs text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full font-medium">
                    Open to work
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Skills */}
          {candidate.skills.length > 0 && (
            <div className="mt-5 pt-5 border-t border-slate-100">
              <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Skills</h3>
              <div className="flex flex-wrap gap-1.5">
                {candidate.skills.map((skill) => (
                  <span key={skill} className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Experience */}
        {candidate.experiences.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6 mb-4">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Briefcase size={14} className="text-slate-400" /> Experience
            </h2>
            <div className="space-y-4">
              {candidate.experiences.map((exp, i) => (
                <div key={i} className="flex gap-3">
                  {exp.company_logo_url ? (
                    <Image src={exp.company_logo_url} alt={exp.company} width={32} height={32} className="rounded-lg shrink-0 mt-0.5" unoptimized />
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-xs text-slate-500 shrink-0 mt-0.5">
                      {exp.company.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium text-slate-900">{exp.title}</p>
                    <p className="text-xs text-slate-500">
                      {exp.company}
                      {exp.company_type && <span className="ml-1 text-slate-400">· {exp.company_type}</span>}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {exp.start_year} – {exp.end_year ?? 'Present'}
                    </p>
                    {exp.description && (
                      <p className="text-xs text-slate-600 mt-1.5 leading-relaxed">{exp.description}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Education */}
        {candidate.education.length > 0 && (
          <div className="bg-white rounded-2xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <GraduationCap size={14} className="text-slate-400" /> Education
            </h2>
            <div className="space-y-3">
              {candidate.education.map((edu, i) => (
                <div key={i}>
                  <p className="text-sm font-medium text-slate-900">{edu.school}</p>
                  <p className="text-xs text-slate-500">
                    {edu.degree}{edu.field ? ` · ${edu.field}` : ''}
                    {edu.graduation_year ? ` · ${edu.graduation_year}` : ''}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
