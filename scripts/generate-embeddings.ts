/**
 * Generates Gemini embeddings for candidates without one.
 * Free tier: 100 req/min for gemini-embedding-2.
 * Run: npx ts-node --project tsconfig.scripts.json scripts/generate-embeddings.ts [limit]
 * Default limit: 5000 (original assessment candidates)
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY!
const LIMIT = parseInt(process.argv[2] ?? '5000', 10)

const db = createClient(SUPABASE_URL, SERVICE_KEY)

const BATCH_SIZE = 50
const CONCURRENCY = 3          // parallel embed calls per batch
const DELAY_MS = 2200          // ms between calls → ~3 * (60000/2200) ≈ 82 req/min (under 100 limit)

const EMBED_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${GEMINI_KEY}`

async function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)) }

async function embedOne(text: string, retries = 4): Promise<number[]> {
  const res = await fetch(EMBED_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text: text.slice(0, 500) }] },
      outputDimensionality: 1536,
    }),
  })
  if (res.status === 429 && retries > 0) {
    const body = await res.json() as { error?: { message?: string } }
    const waitMatch = body.error?.message?.match(/retry in (\d+)/)
    const waitSecs = waitMatch ? parseInt(waitMatch[1], 10) + 2 : 30
    console.log(`  Rate limited — waiting ${waitSecs}s...`)
    await sleep(waitSecs * 1000)
    return embedOne(text, retries - 1)
  }
  if (!res.ok) throw new Error(`Embed failed: ${res.status} ${await res.text()}`)
  const json = await res.json() as { embedding: { values: number[] } }
  return json.embedding.values
}

function candidateToText(c: Record<string, unknown>): string {
  const skills = Array.isArray(c.skills) ? (c.skills as string[]).join(', ') : ''
  const edu = Array.isArray(c.education)
    ? (c.education as Array<{ degree?: string; school?: string }>)
        .map((e) => `${e.degree ?? ''} ${e.school ?? ''}`.trim()).join('; ')
    : ''
  const exp = Array.isArray(c.experiences)
    ? (c.experiences as Array<{ company_type?: string }>)
        .map((e) => e.company_type).filter(Boolean).join(', ')
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
  console.log(`Embedding up to ${LIMIT} candidates (${CONCURRENCY} concurrent, ${DELAY_MS}ms delay)...`)

  let total = 0

  while (total < LIMIT) {
    const remaining = LIMIT - total
    const fetchCount = Math.min(BATCH_SIZE, remaining)
    const { data, error } = await db
      .from('candidates')
      .select('id, role, seniority, location_city, skills, years_experience, open_to_work, education, experiences')
      .is('embedding', null)
      .range(0, fetchCount - 1)

    if (error) { console.error(error.message); process.exit(1) }
    if (!data || data.length === 0) break

    for (let i = 0; i < data.length; i += CONCURRENCY) {
      const chunk = data.slice(i, i + CONCURRENCY)
      const texts = chunk.map(candidateToText)

      // Sequential within chunk to respect rate limit
      const embeddings: number[][] = []
      for (let j = 0; j < texts.length; j++) {
        if (j > 0) await sleep(DELAY_MS)
        embeddings.push(await embedOne(texts[j]))
      }

      await Promise.all(
        chunk.map((c, j) =>
          db.from('candidates').update({ embedding: JSON.stringify(embeddings[j]) }).eq('id', c.id)
        )
      )
    }

    total += data.length
    console.log(`  ${total} embedded`)
    if (data.length < fetchCount) break
  }

  console.log(`Done. ${total} embeddings generated.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
