import { NextRequest } from 'next/server'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

type Params = Promise<{ shortlist_id: string }>

export async function GET(req: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const { shortlist_id } = await params
  const supabase = createServiceClient()

  // Verify ownership
  const { data: sl } = await supabase
    .from('shortlists')
    .select('id')
    .eq('id', shortlist_id)
    .eq('company_id', auth.companyId)
    .single()

  if (!sl) return Response.json({ error: 'Not found' }, { status: 404 })

  const { data, error } = await supabase
    .from('shortlist_candidates')
    .select('candidate_id, added_at, candidates(id, full_name, avatar_url, current_title, current_company, role, seniority, location_city)')
    .eq('shortlist_id', shortlist_id)
    .order('added_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  const candidates = (data ?? []).map((row) => row.candidates).filter(Boolean)

  return Response.json(candidates)
}
