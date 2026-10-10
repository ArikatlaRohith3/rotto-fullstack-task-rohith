import { NextRequest } from 'next/server'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { SearchFilters } from '@/lib/types'

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const supabase = createServiceClient()
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalSearches },
    { count: totalCandidates },
    { count: totalShortlists },
    { data: recentSearches },
    { count: openToWork },
  ] = await Promise.all([
    supabase.from('searches').select('*', { count: 'exact', head: true }).eq('company_id', auth.companyId),
    supabase.from('candidates').select('*', { count: 'exact', head: true }),
    supabase.from('shortlists').select('*', { count: 'exact', head: true }).eq('company_id', auth.companyId),
    supabase
      .from('searches')
      .select('created_at, filters')
      .eq('company_id', auth.companyId)
      .gte('created_at', thirtyDaysAgo)
      .order('created_at', { ascending: true }),
    supabase.from('candidates').select('*', { count: 'exact', head: true }).eq('open_to_work', true),
  ])

  // Aggregate from recent searches
  const byDay: Record<string, number> = {}
  const skillCounts: Record<string, number> = {}
  const locationCounts: Record<string, number> = {}
  const roleCounts: Record<string, number> = {}

  for (const s of recentSearches ?? []) {
    const day = (s.created_at as string).slice(0, 10)
    byDay[day] = (byDay[day] ?? 0) + 1

    const f = s.filters as SearchFilters
    for (const skill of f.skills ?? []) {
      skillCounts[skill] = (skillCounts[skill] ?? 0) + 1
    }
    if (f.location) locationCounts[f.location] = (locationCounts[f.location] ?? 0) + 1
    if (f.role) {
      const role = f.role.trim()
      roleCounts[role] = (roleCounts[role] ?? 0) + 1
    }
  }

  // Fill missing days in the last 30 days with 0
  const searches_by_day = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000)
    const key = d.toISOString().slice(0, 10)
    searches_by_day.push({ date: key, count: byDay[key] ?? 0 })
  }

  const top_skills = Object.entries(skillCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 10)
    .map(([skill, count]) => ({ skill, count }))

  const top_locations = Object.entries(locationCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([location, count]) => ({ location, count }))

  const top_roles = Object.entries(roleCounts)
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([role, count]) => ({ role, count }))

  return Response.json({
    total_searches: totalSearches ?? 0,
    total_candidates: totalCandidates ?? 0,
    total_shortlists: totalShortlists ?? 0,
    open_to_work: openToWork ?? 0,
    searches_by_day,
    top_skills,
    top_locations,
    top_roles,
  })
}
