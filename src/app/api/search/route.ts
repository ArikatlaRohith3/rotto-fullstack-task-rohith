import { NextRequest } from 'next/server'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { extractFilters } from '@/lib/llm/extractFilters'
import { runSearch } from '@/lib/search/buildQuery'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const body = await req.json().catch(() => null)
  if (!body?.brief || typeof body.brief !== 'string') {
    return Response.json({ error: 'brief is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Atomically check + increment search count (concurrency-safe)
  const { data: usageResult, error: usageError } = await supabase.rpc('use_search', {
    p_company_id: auth.companyId,
  })

  if (usageError) {
    return Response.json({ error: 'Failed to check plan' }, { status: 500 })
  }

  const usage = usageResult as { allowed: boolean; searches_remaining: number | null }

  if (!usage.allowed) {
    return Response.json(
      {
        error: 'Search limit reached. Upgrade to continue searching.',
        searches_remaining: 0,
      },
      { status: 402 }
    )
  }

  // Extract filters via LLM
  let filters
  try {
    filters = await extractFilters(body.brief)
  } catch (e) {
    console.error('LLM extraction failed:', e)
    filters = {}
  }

  // Run the search
  let ids: string[] = []
  let candidates
  try {
    const result = await runSearch(filters)
    ids = result.ids
    candidates = result.candidates
  } catch (e) {
    console.error('Search failed:', e)
    return Response.json({ error: 'Search failed' }, { status: 500 })
  }

  // Store search record
  const { data: search, error: searchError } = await supabase
    .from('searches')
    .insert({
      company_id: auth.companyId,
      recruiter_id: auth.userId,
      brief: body.brief,
      filters,
      result_ids: ids,
      total: ids.length,
    })
    .select('id')
    .single()

  if (searchError || !search) {
    return Response.json({ error: 'Failed to save search' }, { status: 500 })
  }

  return Response.json({
    search_id: search.id,
    filters,
    total: ids.length,
    results: candidates.slice(0, 20),
    searches_remaining: usage.searches_remaining,
  })
}
