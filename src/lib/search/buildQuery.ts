import { SearchFilters, CandidateSummary } from '@/lib/types'
import { createServiceClient } from '@/lib/supabase/service'

const SUMMARY_FIELDS = [
  'id', 'full_name', 'avatar_url', 'headline', 'current_title',
  'current_company', 'current_company_logo_url', 'role', 'seniority',
  'years_experience', 'location_city', 'location_state', 'skills',
  'open_to_work', 'experiences', 'education',
].join(', ')

export async function runSearch(
  filters: SearchFilters,
  briefEmbedding?: number[]
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
    query = query.contains('skills', filters.skills)
  }
  if (filters.min_years_experience != null) {
    query = query.gte('years_experience', filters.min_years_experience)
  }
  if (filters.max_years_experience != null) {
    query = query.lte('years_experience', filters.max_years_experience)
  }
  if (filters.role) {
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

  // Post-filter for JSONB fields
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

  // Semantic reranking: if we have a brief embedding, ask pgvector to reorder
  if (briefEmbedding && rows.length > 1) {
    const hardFilterIds = rows.map((r) => r.id)
    const { data: reranked } = await supabase.rpc('rerank_by_embedding', {
      p_embedding: JSON.stringify(briefEmbedding),
      p_candidate_ids: hardFilterIds,
      p_limit: 500,
    })

    if (reranked && reranked.length > 0) {
      // Build lookup for semantic similarity scores
      const simMap = new Map<string, number>(
        (reranked as Array<{ id: string; similarity: number }>).map((r) => [r.id, r.similarity])
      )

      // Score each candidate: 60% semantic + 40% keyword score
      const keywordScores = new Map(
        rows.map((r) => [r.id, scoreCandidate(r, filters)])
      )
      const maxKw = Math.max(...Array.from(keywordScores.values()), 1)

      rows.sort((a, b) => {
        const simA = simMap.get(a.id) ?? 0
        const simB = simMap.get(b.id) ?? 0
        const kwA = (keywordScores.get(a.id) ?? 0) / maxKw
        const kwB = (keywordScores.get(b.id) ?? 0) / maxKw
        const scoreA = 0.6 * simA + 0.4 * kwA
        const scoreB = 0.6 * simB + 0.4 * kwB
        return scoreB - scoreA
      })
    } else {
      // Fallback to keyword scoring if no embeddings exist yet
      rows.sort((a, b) => scoreCandidate(b, filters) - scoreCandidate(a, filters))
    }
  } else {
    // Pure keyword scoring
    rows.sort((a, b) => scoreCandidate(b, filters) - scoreCandidate(a, filters))
  }

  return {
    ids: rows.map((r) => r.id),
    candidates: rows.slice(0, 20).map(
      ({ education: _ed, experiences: _ex, ...rest }) => rest as CandidateSummary
    ),
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

  if (filters.skills?.length) {
    score += filters.skills.filter((s) => c.skills?.includes(s)).length * 2
  }
  if (filters.seniority && c.seniority === filters.seniority) score += 5
  if (filters.location && c.location_city?.toLowerCase().includes(filters.location.toLowerCase())) score += 3
  if (filters.open_to_work === true && c.open_to_work) score += 2
  if (filters.company_type && c.experiences?.some((e) => e.company_type === filters.company_type)) score += 2
  if (filters.education_level && c.education?.some((e) => e.degree === filters.education_level)) score += 3
  if (filters.education_school) {
    const school = filters.education_school.toLowerCase()
    if (c.education?.some((e) => e.school?.toLowerCase().includes(school))) score += 3
  }
  if (filters.role) {
    const words = filters.role.toLowerCase().split(/\s+/).filter(Boolean)
    words.forEach((w) => { if (c.role?.toLowerCase().includes(w)) score += 1 })
  }
  if (c.years_experience != null) {
    score += Math.min(c.years_experience, 15) * 0.05
  }

  return score
}
