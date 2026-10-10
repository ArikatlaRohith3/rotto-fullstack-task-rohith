/**
 * Generates Gemini embeddings for all candidates without one.
 * Run: npx ts-node --project tsconfig.scripts.json scripts/generate-embeddings.ts
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY!

const db = createClient(SUPABASE_URL, SERVICE_KEY)

const BATCH_SIZE = 50
const EMBED_CONCURRENCY = 5
const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${GEMINI_KEY}`

async function embedOne(text: string): Promise<number[]> {
  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text: text.slice(0, 500) }] },
      outputDimensionality: 1536,
    }),
  })
  if (!res.ok) throw new Error(`Embed failed: ${res.status} ${await res.text()}`)
  const json = await res.json() as { embedding: { values: number[] } }
  return json.embedding.values
}

function candidateToText(c: Record<string, unknown>): string {
  const skills = Array.isArray(c.skills) ? (c.skills as string[]).join(', ') : ''
  const edu = Array.isArray(c.education)
    ? (c.education as Array<{ degree?: string; school?: string }>)
        .map((e) => `${e.degree ?? ''} ${e.school ?? ''}`.trim())
        .join('; ')
    : ''
  const exp = Array.isArray(c.experiences)
    ? (c.experiences as Array<{ company_type?: string }>)
        .map((e) => e.company_type)
        .filter(Boolean)
        .join(', ')
    : ''
  return [
    `${c.seniority} ${c.role} in ${c.location_city}`,
    skills && `Skills: ${skills}`,
    `${c.years_experience} years experience`,
    c.open_to_work ? 'Open to work' : '',
    edu && `Education: ${edu}`,
    exp && `Background: ${exp}`,
  ].filter(Boolean).join('. ')
}

async function main() {
  console.log('Fetching candidates without embeddings...')

  let total = 0

  while (true) {
    const { data, error } = await db
      .from('candidates')
      .select('id, role, seniority, location_city, skills, years_experience, open_to_work, education, experiences')
      .is('embedding', null)
      .range(0, BATCH_SIZE - 1)

    if (error) { console.error(error.message); process.exit(1) }
    if (!data || data.length === 0) break

    for (let i = 0; i < data.length; i += EMBED_CONCURRENCY) {
      const chunk = data.slice(i, i + EMBED_CONCURRENCY)
      const embeddings = await Promise.all(chunk.map((c) => embedOne(candidateToText(c))))

      await Promise.all(
        chunk.map((c, j) =>
          db.from('candidates').update({ embedding: JSON.stringify(embeddings[j]) }).eq('id', c.id)
        )
      )
    }

    total += data.length
    if (total % 500 === 0 || data.length < BATCH_SIZE) {
      console.log(`  Embedded ${total} candidates...`)
    }

    if (data.length < BATCH_SIZE) break
  }

  console.log(`Done. ${total} embeddings generated.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
