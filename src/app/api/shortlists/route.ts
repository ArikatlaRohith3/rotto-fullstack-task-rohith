import { NextRequest } from 'next/server'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('shortlists')
    .select('id, name, created_at')
    .eq('company_id', auth.companyId)
    .order('created_at', { ascending: false })

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json(data ?? [])
}

export async function POST(req: NextRequest) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const body = await req.json().catch(() => null)
  if (!body?.name || typeof body.name !== 'string' || !body.name.trim()) {
    return Response.json({ error: 'name is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('shortlists')
    .insert({ company_id: auth.companyId, name: body.name.trim() })
    .select('id, name, created_at')
    .single()

  if (error || !data) return Response.json({ error: error?.message }, { status: 500 })

  return Response.json(data, { status: 201 })
}
