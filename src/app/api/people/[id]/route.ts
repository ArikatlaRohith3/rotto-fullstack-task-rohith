import { NextRequest } from 'next/server'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const { id } = await params
  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('candidates')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !data) {
    return Response.json({ error: 'Candidate not found' }, { status: 404 })
  }

  return Response.json(data)
}
