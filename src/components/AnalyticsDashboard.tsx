'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { BarChart2, Users, Search, List, TrendingUp, LogOut, ArrowLeft } from 'lucide-react'

interface AnalyticsData {
  total_searches: number
  total_candidates: number
  total_shortlists: number
  open_to_work: number
  searches_by_day: Array<{ date: string; count: number }>
  top_skills: Array<{ skill: string; count: number }>
  top_locations: Array<{ location: string; count: number }>
  top_roles: Array<{ role: string; count: number }>
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: number | string; sub?: string }) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-brand-50 rounded-lg flex items-center justify-center text-brand-600">
          {icon}
        </div>
        <span className="text-sm text-slate-500 font-medium">{label}</span>
      </div>
      <p className="text-2xl font-bold text-slate-900">{typeof value === 'number' ? value.toLocaleString() : value}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  )
}

function HBar({ label, count, max }: { label: string; count: number; max: number }) {
  const pct = max > 0 ? (count / max) * 100 : 0
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs text-slate-600 truncate shrink-0">{label}</span>
      <div className="flex-1 bg-slate-100 rounded-full h-2">
        <div className="bg-brand-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-6 text-xs text-slate-500 text-right shrink-0">{count}</span>
    </div>
  )
}

function Sparkline({ data }: { data: Array<{ date: string; count: number }> }) {
  const max = Math.max(...data.map((d) => d.count), 1)
  const W = 600; const H = 80; const PAD = 4
  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((d.count / max) * (H - PAD * 2))
    return `${x},${y}`
  }).join(' ')

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-20" preserveAspectRatio="none">
      <polyline
        points={pts}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        className="text-brand-500"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Area fill */}
      <polyline
        points={`${PAD},${H} ${pts} ${W - PAD},${H}`}
        fill="currentColor"
        className="text-brand-100"
        opacity="0.5"
      />
    </svg>
  )
}

export default function AnalyticsDashboard({ token }: { token: string }) {
  const router = useRouter()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/analytics', { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false))
  }, [token])

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const maxSkill = data ? Math.max(...data.top_skills.map((s) => s.count), 1) : 1
  const maxLoc = data ? Math.max(...data.top_locations.map((l) => l.count), 1) : 1
  const maxRole = data ? Math.max(...data.top_roles.map((r) => r.count), 1) : 1
  const totalSearchesThisMonth = data?.searches_by_day.reduce((a, b) => a + b.count, 0) ?? 0

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Nav */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push('/search')}
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition"
            >
              <ArrowLeft size={15} />
              <span>Back to Search</span>
            </button>
            <div className="w-px h-5 bg-slate-200" />
            <div className="flex items-center gap-2">
              <BarChart2 size={16} className="text-brand-600" />
              <span className="font-semibold text-slate-900">Analytics</span>
            </div>
          </div>
          <button
            onClick={handleSignOut}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition"
            title="Sign out"
          >
            <LogOut size={15} />
          </button>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {loading ? (
          <div className="flex items-center justify-center py-32 text-slate-400">Loading…</div>
        ) : !data ? (
          <div className="text-center py-32 text-slate-400">Failed to load analytics.</div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
              <StatCard icon={<Search size={16} />} label="Total Searches" value={data.total_searches} sub={`${totalSearchesThisMonth} this month`} />
              <StatCard icon={<Users size={16} />} label="Candidates" value={data.total_candidates} sub={`${data.open_to_work.toLocaleString()} open to work`} />
              <StatCard icon={<List size={16} />} label="Shortlists" value={data.total_shortlists} />
              <StatCard icon={<TrendingUp size={16} />} label="Searches / Month" value={totalSearchesThisMonth} sub="last 30 days" />
            </div>

            {/* Search volume chart */}
            <div className="bg-white rounded-xl border border-slate-200 p-5 mb-6">
              <h2 className="text-sm font-semibold text-slate-700 mb-1">Search Volume</h2>
              <p className="text-xs text-slate-400 mb-4">Last 30 days</p>
              {totalSearchesThisMonth === 0 ? (
                <p className="text-sm text-slate-400 py-6 text-center">No searches yet. Run some searches to see trends.</p>
              ) : (
                <>
                  <Sparkline data={data.searches_by_day} />
                  <div className="flex justify-between text-xs text-slate-400 mt-1">
                    <span>{data.searches_by_day[0]?.date}</span>
                    <span>{data.searches_by_day[data.searches_by_day.length - 1]?.date}</span>
                  </div>
                </>
              )}
            </div>

            {/* Top skills + locations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Skills Searched</h2>
                {data.top_skills.length === 0 ? (
                  <p className="text-sm text-slate-400">No data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.top_skills.map((s) => (
                      <HBar key={s.skill} label={s.skill} count={s.count} max={maxSkill} />
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Locations Searched</h2>
                {data.top_locations.length === 0 ? (
                  <p className="text-sm text-slate-400">No data yet.</p>
                ) : (
                  <div className="space-y-3">
                    {data.top_locations.map((l) => (
                      <HBar key={l.location} label={l.location} count={l.count} max={maxLoc} />
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Top roles */}
            {data.top_roles.length > 0 && (
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-700 mb-4">Top Roles Searched</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {data.top_roles.map((r) => (
                    <HBar key={r.role} label={r.role} count={r.count} max={maxRole} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
