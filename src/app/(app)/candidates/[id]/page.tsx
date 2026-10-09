import { createClient } from '@/lib/supabase/server'
import CandidateProfilePage from '@/components/CandidateProfilePage'

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  return <CandidateProfilePage candidateId={id} token={token} />
}
