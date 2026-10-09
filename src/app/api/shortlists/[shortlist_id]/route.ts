import { NextRequest } from 'next/server'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

type Params = Promise<{ shortlist_id: string }>

export async function PATCH(req: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const { shortlist_id } = await params
  const body = await req.json().catch(() => null)
  if (!body?.name) return Response.json({ error: 'name required' }, { status: 400 })

  const supabase = createServiceClient()
  const { error } = await supabase
    .from('shortlists')
    .update({ name: body.name.trim() })
    .eq('id', shortlist_id)
    .eq('company_id', auth.companyId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const { shortlist_id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('shortlists')
    .delete()
    .eq('id', shortlist_id)
    .eq('company_id', auth.companyId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
