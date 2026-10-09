import { NextRequest } from 'next/server'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

export async function GET(req: NextRequest) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('companies')
    .select('plan, searches_used')
    .eq('id', auth.companyId)
    .single()

  if (error || !data) return Response.json({ error: 'Not found' }, { status: 404 })

  const plan = data.plan as 'free' | 'paid'
  const searches_remaining = plan === 'paid' ? null : Math.max(0, 1 - data.searches_used)

  return Response.json({ plan, searches_remaining })
}
