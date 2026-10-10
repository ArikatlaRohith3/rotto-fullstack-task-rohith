import { createServiceClient } from '@/lib/supabase/service'

// Vercel cron: runs every 5 days to keep the Supabase free-tier project active.
// Free-tier projects pause after 7 days of inactivity; this prevents that.
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET
  if (secret && req.headers.get('authorization') !== `Bearer ${secret}`) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createServiceClient()
  const { error } = await supabase.from('candidates').select('id').limit(1)

  return Response.json({
    ok: !error,
    error: error?.message ?? null,
    ts: new Date().toISOString(),
  })
}
