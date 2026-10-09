import { NextRequest } from 'next/server'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const PAGE_SIZE = 20

const SUMMARY_FIELDS = [
  'id', 'full_name', 'avatar_url', 'headline', 'current_title',
  'current_company', 'current_company_logo_url', 'role', 'seniority',
  'years_experience', 'location_city', 'location_state', 'skills', 'open_to_work',
].join(', ')

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ search_id: string }> }
) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const { search_id } = await params
  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get('page') ?? '1', 10))

  const supabase = createServiceClient()

  // Load the search record (company-scoped via the query)
  const { data: search, error } = await supabase
    .from('searches')
    .select('id, result_ids, total, filters, company_id')
    .eq('id', search_id)
    .eq('company_id', auth.companyId)
    .single()

  if (error || !search) {
    return Response.json({ error: 'Search not found' }, { status: 404 })
  }

  const allIds: string[] = search.result_ids ?? []
  const start = (page - 1) * PAGE_SIZE
  const pageIds = allIds.slice(start, start + PAGE_SIZE)

  if (pageIds.length === 0) {
    return Response.json({ search_id, filters: search.filters, total: search.total, results: [], page })
  }

  // Fetch the candidates for this page in order
  const { data: candidatesRaw, error: candError } = await supabase
    .from('candidates')
    .select(SUMMARY_FIELDS)
    .in('id', pageIds)

  if (candError) {
    return Response.json({ error: 'Failed to fetch candidates' }, { status: 500 })
  }

  const candidates = ((candidatesRaw ?? []) as unknown) as Array<{ id: string; [key: string]: unknown }>

  // Preserve the original ranking order
  const ordered = pageIds
    .map((id) => candidates.find((c) => c.id === id))
    .filter(Boolean)

  return Response.json({
    search_id,
    filters: search.filters,
    total: search.total,
    results: ordered,
    page,
  })
}
