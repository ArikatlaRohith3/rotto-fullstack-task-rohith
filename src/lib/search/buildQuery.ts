import { SearchFilters, CandidateSummary } from '@/lib/types'
import { createServiceClient } from '@/lib/supabase/service'

const SUMMARY_FIELDS = [
  'id', 'full_name', 'avatar_url', 'headline', 'current_title',
  'current_company', 'current_company_logo_url', 'role', 'seniority',
  'years_experience', 'location_city', 'location_state', 'skills',
  'open_to_work', 'experiences', 'education',
].join(', ')

export async function runSearch(
  filters: SearchFilters
): Promise<{ ids: string[]; candidates: CandidateSummary[] }> {
  const supabase = createServiceClient()

  // Build Supabase query with all hard filters
  let query = supabase.from('candidates').select(SUMMARY_FIELDS).limit(5000)

  if (filters.location) {
    query = query.ilike('location_city', `%${filters.location}%`)
  }
  if (filters.seniority) {
    query = query.eq('seniority', filters.seniority)
  }
  if (filters.open_to_work === true) {
    query = query.eq('open_to_work', true)
  }
  if (filters.skills?.length) {
    // Candidate must have ALL listed skills
    query = query.contains('skills', filters.skills)
  }
  if (filters.min_years_experience != null) {
    query = query.gte('years_experience', filters.min_years_experience)
  }
  if (filters.max_years_experience != null) {
    query = query.lte('years_experience', filters.max_years_experience)
  }
  if (filters.role) {
    // Split multi-word role and require each word individually (AND logic)
    const words = filters.role.trim().split(/\s+/).filter(Boolean)
    for (const word of words) {
      query = query.ilike('role', `%${word}%`)
    }
  }

  const { data, error } = await query
  if (error) throw error

  type RowType = CandidateSummary & {
    education: Array<{ school?: string; degree?: string }>
    experiences: Array<{ company_type?: string }>
  }
  let rows = ((data ?? []) as unknown) as RowType[]

  // Post-filter for JSONB fields (Supabase .filter cs doesn't do partial match)
  if (filters.company_type) {
    rows = rows.filter((r) =>
      r.experiences?.some((e) => e.company_type === filters.company_type)
    )
  }
  if (filters.education_level) {
    rows = rows.filter((r) =>
      r.education?.some((e) => e.degree === filters.education_level)
    )
  }
  if (filters.education_school) {
    const school = filters.education_school.toLowerCase()
    rows = rows.filter((r) =>
      r.education?.some((e) => e.school?.toLowerCase().includes(school))
    )
  }

  // Score and rank
  const scored = rows
    .map((r) => ({ ...r, score: scoreCandidate(r, filters) }))
    .sort((a, b) => b.score - a.score)

  return {
    ids: scored.map((r) => r.id),
    candidates: scored.map(({ education: _ed, experiences: _ex, ...rest }) => rest as CandidateSummary),
  }
}

function scoreCandidate(
  c: CandidateSummary & {
    education?: Array<{ school?: string; degree?: string }>
    experiences?: Array<{ company_type?: string }>
  },
  filters: SearchFilters
): number {
  let score = 0

  // Skills: +2 per matching skill (most important signal)
  if (filters.skills?.length) {
    score += filters.skills.filter((s) => c.skills?.includes(s)).length * 2
  }
  // Seniority exact match
  if (filters.seniority && c.seniority === filters.seniority) score += 5
  // Location
  if (filters.location && c.location_city?.toLowerCase().includes(filters.location.toLowerCase())) score += 3
  // Open to work
  if (filters.open_to_work === true && c.open_to_work) score += 2
  // Company type
  if (filters.company_type && c.experiences?.some((e) => e.company_type === filters.company_type)) score += 2
  // Education level
  if (filters.education_level && c.education?.some((e) => e.degree === filters.education_level)) score += 3
  // Education school
  if (filters.education_school) {
    const school = filters.education_school.toLowerCase()
    if (c.education?.some((e) => e.school?.toLowerCase().includes(school))) score += 3
  }
  // Role keyword match
  if (filters.role) {
    const words = filters.role.toLowerCase().split(/\s+/).filter(Boolean)
    words.forEach((w) => { if (c.role?.toLowerCase().includes(w)) score += 1 })
  }
  // Experience bonus: reward experience within requested range
  if (c.years_experience != null) {
    score += Math.min(c.years_experience, 15) * 0.05
  }

  return score
}
