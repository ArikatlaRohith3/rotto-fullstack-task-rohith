import { NextRequest } from 'next/server'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

type Params = Promise<{ shortlist_id: string; person_id: string }>

async function verifyOwnership(companyId: string, shortlistId: string) {
  const supabase = createServiceClient()
  const { data } = await supabase
    .from('shortlists')
    .select('id')
    .eq('id', shortlistId)
    .eq('company_id', companyId)
    .single()
  return !!data
}

export async function POST(req: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const { shortlist_id, person_id } = await params

  if (!(await verifyOwnership(auth.companyId, shortlist_id))) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('shortlist_candidates')
    .upsert(
      { shortlist_id, candidate_id: person_id },
      { onConflict: 'shortlist_id,candidate_id', ignoreDuplicates: true }
    )

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true }, { status: 200 })
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const { shortlist_id, person_id } = await params

  if (!(await verifyOwnership(auth.companyId, shortlist_id))) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('shortlist_candidates')
    .delete()
    .eq('shortlist_id', shortlist_id)
    .eq('candidate_id', person_id)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
