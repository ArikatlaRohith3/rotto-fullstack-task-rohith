import { NextRequest } from 'next/server'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'

const SUMMARY_FIELDS = [
  'id', 'full_name', 'avatar_url', 'headline', 'current_title',
  'current_company', 'current_company_logo_url', 'role', 'seniority',
  'years_experience', 'location_city', 'location_state', 'skills', 'open_to_work',
].join(', ')

async function generateEmbedding(text: string): Promise<number[] | null> {
  const key = process.env.GEMINI_API_KEY
  if (!key) return null
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${key}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: { parts: [{ text: text.slice(0, 500) }] },
          outputDimensionality: 1536,
        }),
      }
    )
    if (!res.ok) return null
    const json = await res.json() as { embedding: { values: number[] } }
    return json.embedding.values
  } catch {
    return null
  }
}

function candidateToText(c: Record<string, unknown>): string {
  const skills = Array.isArray(c.skills) ? (c.skills as string[]).join(', ') : ''
  return [c.current_title, c.role, c.seniority, `${c.years_experience ?? ''}y exp`, skills, c.location_city]
    .filter(Boolean).join(' | ')
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ candidate_id: string }> }
) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const { candidate_id } = await params
  const supabase = createServiceClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('embedding, full_name, role, current_title, seniority, years_experience, skills, location_city')
    .eq('id', candidate_id)
    .single()

  if (!candidate) return Response.json({ error: 'Candidate not found' }, { status: 404 })

  let embedding = candidate.embedding as number[] | null

  if (!embedding) {
    // Generate on-demand so Find Similar works for every candidate
    const text = candidateToText(candidate as unknown as Record<string, unknown>)
    embedding = await generateEmbedding(text)

    if (embedding) {
      // Persist so future calls are instant
      await supabase.from('candidates').update({ embedding }).eq('id', candidate_id)
    }
  }

  if (!embedding) {
    // Last-resort fallback: find by same role when embedding unavailable
    const { data: fallback } = await supabase
      .from('candidates')
      .select(SUMMARY_FIELDS)
      .neq('id', candidate_id)
      .eq('role', candidate.role ?? '')
      .limit(20)
    return Response.json({ source: candidate_id, source_name: candidate.full_name, results: fallback ?? [], semantic: false })
  }

  // Use pgvector to find globally similar candidates
  const { data: similar } = await supabase.rpc('find_similar_candidates', {
    p_embedding: JSON.stringify(candidate.embedding),
    p_exclude_id: candidate_id,
    p_limit: 20,
  })

  const ids = (similar as Array<{ id: string }> ?? []).map((r) => r.id)

  const { data: candidates } = await supabase
    .from('candidates')
    .select(SUMMARY_FIELDS)
    .in('id', ids)

  const rows = (candidates ?? []) as unknown as Array<Record<string, unknown>>
  const ranked = ids
    .map((id) => rows.find((c) => c.id === id))
    .filter(Boolean)

  return Response.json({
    source: candidate_id,
    source_name: candidate.full_name,
    results: ranked,
    semantic: true,
  })
}
