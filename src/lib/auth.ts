import { NextRequest } from 'next/server'
import { createServiceClient } from '@/lib/supabase/service'

export interface AuthContext {
  userId: string
  companyId: string
}

export async function getAuthContext(req: NextRequest): Promise<AuthContext | null> {
  const authHeader = req.headers.get('authorization')
  if (!authHeader?.startsWith('Bearer ')) return null

  const token = authHeader.slice(7)
  const supabase = createServiceClient()

  const { data: { user }, error } = await supabase.auth.getUser(token)
  if (error || !user) return null

  const { data: recruiter } = await supabase
    .from('recruiters')
    .select('company_id')
    .eq('id', user.id)
    .single()

  if (!recruiter) return null

  return { userId: user.id, companyId: recruiter.company_id }
}

export function unauthorized() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 })
}
