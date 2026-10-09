import { NextRequest } from 'next/server'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

type Params = Promise<{ id: string }>

export async function DELETE(req: NextRequest, { params }: { params: Params }) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const { id } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('saved_briefs')
    .delete()
    .eq('id', id)
    .eq('company_id', auth.companyId)

  if (error) return Response.json({ error: error.message }, { status: 500 })

  return Response.json({ ok: true })
}
