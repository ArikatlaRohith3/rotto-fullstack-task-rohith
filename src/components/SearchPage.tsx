'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { SearchFilters, CandidateSummary, Shortlist, SavedBrief } from '@/lib/types'
import FilterChips from './FilterChips'
import CandidateCard from './CandidateCard'
import ShortlistPanel from './ShortlistPanel'
import SavedBriefs from './SavedBriefs'
import PlanBanner from './PlanBanner'
import { Search, Bookmark, List, LogOut, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react'

interface Props {
  token: string
  userEmail: string
}

interface SearchState {
  searchId: string
  filters: SearchFilters
  total: number
  results: CandidateSummary[]
  searchesRemaining: number | null
}

export default function SearchPage({ token, userEmail }: Props) {
  const router = useRouter()
  const [brief, setBrief] = useState('')
  const [searching, setSearching] = useState(false)
  const [searchState, setSearchState] = useState<SearchState | null>(null)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [pageLoading, setPageLoading] = useState(false)
  const [shortlists, setShortlists] = useState<Shortlist[]>([])
  const [savedBriefs, setSavedBriefs] = useState<SavedBrief[]>([])
  const [plan, setPlan] = useState<{ plan: 'free' | 'paid'; searches_remaining: number | null } | null>(null)
  const [sidePanel, setSidePanel] = useState<'shortlists' | 'saved' | null>(null)
  const [shortlistsForCandidate, setShortlistsForCandidate] = useState<Record<string, string[]>>({})
  const inputRef = useRef<HTMLInputElement>(null)

  const authHeader = { Authorization: `Bearer ${token}` }

  const fetchPlan = useCallback(async () => {
    const res = await fetch('/api/plan', { headers: authHeader })
    if (res.ok) setPlan(await res.json())
  }, [token])

  const fetchShortlists = useCallback(async () => {
    const res = await fetch('/api/shortlists', { headers: authHeader })
    if (res.ok) setShortlists(await res.json())
  }, [token])

  const fetchSavedBriefs = useCallback(async () => {
    const res = await fetch('/api/saved-briefs', { headers: authHeader })
    if (res.ok) setSavedBriefs(await res.json())
  }, [token])

  useEffect(() => {
    fetchPlan()
    fetchShortlists()
    fetchSavedBriefs()
  }, [fetchPlan, fetchShortlists, fetchSavedBriefs])

  async function handleSearch(e?: React.FormEvent, overrideBrief?: string, overrideFilters?: SearchFilters) {
    e?.preventDefault()
    const query = overrideBrief ?? brief
    if (!query.trim()) return

    setSearching(true)
    setError('')
    setPage(1)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief: query }),
      })

      const data = await res.json()

      if (res.status === 402) {
        setError(data.error ?? 'Search limit reached.')
        setSearching(false)
        fetchPlan()
        return
      }

      if (!res.ok) {
        setError(data.error ?? 'Search failed.')
        setSearching(false)
        return
      }

      setSearchState({
        searchId: data.search_id,
        filters: overrideFilters ?? data.filters,
        total: data.total,
        results: data.results,
        searchesRemaining: data.searches_remaining,
      })
      fetchPlan()
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setSearching(false)
    }
  }

  async function handleFilterChange(newFilters: SearchFilters) {
    if (!searchState) return
    setSearching(true)
    setError('')
    setPage(1)

    try {
      const res = await fetch('/api/search', {
        method: 'POST',
        headers: { ...authHeader, 'Content-Type': 'application/json' },
        body: JSON.stringify({ brief }),
      })
      const data = await res.json()

      if (res.status === 402) {
        setError(data.error ?? 'Search limit reached.')
        setSearching(false)
        return
      }

      if (res.ok) {
        setSearchState({
          searchId: data.search_id,
          filters: newFilters,
          total: data.total,
          results: data.results,
          searchesRemaining: data.searches_remaining,
        })
        fetchPlan()
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setSearching(false)
    }
  }

  async function handlePageChange(newPage: number) {
    if (!searchState) return
    setPageLoading(true)

    try {
      const res = await fetch(`/api/search/${searchState.searchId}?page=${newPage}`, {
        headers: authHeader,
      })
      if (res.ok) {
        const data = await res.json()
        setSearchState((prev) => prev ? { ...prev, results: data.results } : prev)
        setPage(newPage)
        window.scrollTo({ top: 0, behavior: 'smooth' })
      }
    } finally {
      setPageLoading(false)
    }
  }

  async function handleSaveSearch() {
    if (!searchState) return
    const res = await fetch('/api/saved-briefs', {
      method: 'POST',
      headers: { ...authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, filters: searchState.filters }),
    })
    if (res.ok) fetchSavedBriefs()
  }

  async function handleRunSaved(saved: SavedBrief) {
    setBrief(saved.brief)
    setSidePanel(null)
    await handleSearch(undefined, saved.brief)
  }

  function handleAddToShortlist(candidateId: string, shortlistId: string) {
    setShortlistsForCandidate((prev) => ({
      ...prev,
      [candidateId]: [...(prev[candidateId] ?? []).filter((id) => id !== shortlistId), shortlistId],
    }))
    fetch(`/api/shortlists/${shortlistId}/people/${candidateId}`, {
      method: 'POST',
      headers: authHeader,
    })
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const totalPages = searchState ? Math.ceil(searchState.total / 20) : 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-md flex items-center justify-center">
              <span className="text-white font-bold text-xs">R</span>
            </div>
            <span className="font-semibold text-slate-900">Rotto</span>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setSidePanel(sidePanel === 'saved' ? null : 'saved')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${sidePanel === 'saved' ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <Bookmark size={15} />
              <span className="hidden sm:inline">Saved</span>
            </button>
            <button
              onClick={() => setSidePanel(sidePanel === 'shortlists' ? null : 'shortlists')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition ${sidePanel === 'shortlists' ? 'bg-brand-50 text-brand-600' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              <List size={15} />
              <span className="hidden sm:inline">Lists</span>
              {shortlists.length > 0 && (
                <span className="ml-0.5 bg-brand-600 text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{shortlists.length}</span>
              )}
            </button>
            <div className="w-px h-5 bg-slate-200 mx-1" />
            <span className="text-xs text-slate-500 hidden sm:block mr-1">{userEmail}</span>
            <button onClick={handleSignOut} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition" title="Sign out">
              <LogOut size={15} />
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6 flex gap-5">
        {/* Main content */}
        <main className="flex-1 min-w-0">
          {/* Plan banner */}
          {plan && <PlanBanner plan={plan.plan} searchesRemaining={plan.searches_remaining} />}

          {/* Search bar */}
          <div className="mb-5">
            <form onSubmit={handleSearch} className="relative">
              <div className="flex items-center gap-2 bg-white rounded-xl border border-slate-200 shadow-sm px-4 py-3 focus-within:ring-2 focus-within:ring-brand-500 focus-within:border-transparent transition">
                <Search size={18} className="text-slate-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={brief}
                  onChange={(e) => setBrief(e.target.value)}
                  placeholder="Describe who you're looking for… e.g. senior React engineers in New York"
                  className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 bg-transparent focus:outline-none"
                />
                {searching && <Loader2 size={16} className="text-brand-500 animate-spin shrink-0" />}
                <button
                  type="submit"
                  disabled={searching || !brief.trim()}
                  className="shrink-0 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-40 text-white text-sm font-medium rounded-lg transition"
                >
                  Search
                </button>
              </div>
            </form>
          </div>

          {/* Error */}
          {error && (
            <div className="mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
              {error.includes('limit') && (
                <span className="ml-2 font-medium">
                  — <button className="underline" onClick={() => setSidePanel(null)}>See upgrade options</button>
                </span>
              )}
            </div>
          )}

          {/* Filters + results */}
          {searchState && (
            <>
              {/* Filter chips row */}
              <div className="mb-4 flex items-start gap-3 flex-wrap">
                <FilterChips
                  filters={searchState.filters}
                  onChange={handleFilterChange}
                />
                <div className="ml-auto flex items-center gap-2 shrink-0">
                  <span className="text-sm text-slate-500">
                    {searchState.total} {searchState.total === 1 ? 'result' : 'results'}
                  </span>
                  <button
                    onClick={handleSaveSearch}
                    title="Save this search"
                    className="flex items-center gap-1 text-xs text-slate-500 hover:text-brand-600 px-2 py-1 rounded-lg hover:bg-brand-50 transition"
                  >
                    <Bookmark size={13} />
                    Save
                  </button>
                </div>
              </div>

              {/* Empty state */}
              {searchState.total === 0 && !searching && (
                <div className="text-center py-16 text-slate-400">
                  <p className="text-lg font-medium text-slate-600 mb-1">No results found</p>
                  <p className="text-sm">Try adjusting the filters or rephrasing your search.</p>
                </div>
              )}

              {/* Results grid */}
              {pageLoading ? (
                <div className="flex justify-center py-16">
                  <Loader2 size={24} className="text-brand-500 animate-spin" />
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {searchState.results.map((candidate) => (
                    <CandidateCard
                      key={candidate.id}
                      candidate={candidate}
                      shortlists={shortlists}
                      shortlistedIn={shortlistsForCandidate[candidate.id] ?? []}
                      onAddToShortlist={handleAddToShortlist}
                      onCreateShortlist={async (name) => {
                        const res = await fetch('/api/shortlists', {
                          method: 'POST',
                          headers: { ...authHeader, 'Content-Type': 'application/json' },
                          body: JSON.stringify({ name }),
                        })
                        if (res.ok) {
                          const newList = await res.json()
                          setShortlists((prev) => [newList, ...prev])
                          return newList.id
                        }
                        return null
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1 || pageLoading}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-sm text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages || pageLoading}
                    className="p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}

          {/* Empty home state */}
          {!searchState && !searching && !error && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-brand-50 rounded-xl mb-4">
                <Search size={20} className="text-brand-600" />
              </div>
              <p className="text-base font-medium text-slate-700 mb-1">Search your talent pool</p>
              <p className="text-sm text-slate-400 max-w-xs mx-auto">
                Describe who you&apos;re looking for in plain English — skills, location, experience, whatever matters.
              </p>
            </div>
          )}
        </main>

        {/* Side panels */}
        {sidePanel === 'shortlists' && (
          <aside className="w-72 shrink-0">
            <ShortlistPanel
              shortlists={shortlists}
              token={token}
              onUpdate={fetchShortlists}
              onClose={() => setSidePanel(null)}
            />
          </aside>
        )}

        {sidePanel === 'saved' && (
          <aside className="w-72 shrink-0">
            <SavedBriefs
              briefs={savedBriefs}
              token={token}
              onRun={handleRunSaved}
              onRefresh={fetchSavedBriefs}
              onClose={() => setSidePanel(null)}
            />
          </aside>
        )}
      </div>
    </div>
  )
}
