import { createClient } from '@/lib/supabase/server'
import SearchPage from '@/components/SearchPage'

export default async function Search() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch session token for client-side API calls
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ''

  return <SearchPage token={token} userEmail={user?.email ?? ''} />
}
