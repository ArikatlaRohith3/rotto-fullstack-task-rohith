/**
 * Generates Gemini text-embedding-004 embeddings for all candidates without one.
 * Run: npx ts-node --project tsconfig.scripts.json scripts/generate-embeddings.ts
 */
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const GEMINI_KEY = process.env.GEMINI_API_KEY!

const db = createClient(SUPABASE_URL, SERVICE_KEY)
const genAI = new GoogleGenerativeAI(GEMINI_KEY)
const embModel = genAI.getGenerativeModel({ model: 'text-embedding-004' })

const BATCH_SIZE = 50  // candidates per DB fetch
const EMBED_CONCURRENCY = 5  // parallel embedding calls

function candidateToText(c: Record<string, unknown>): string {
  const skills = Array.isArray(c.skills) ? (c.skills as string[]).join(', ') : ''
  const edu = Array.isArray(c.education)
    ? (c.education as Array<{ degree?: string; school?: string }>)
        .map((e) => `${e.degree ?? ''} ${e.school ?? ''}`.trim())
        .join('; ')
    : ''
  const exp = Array.isArray(c.experiences)
    ? (c.experiences as Array<{ company_type?: string; company?: string }>)
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

async function embedBatch(texts: string[]): Promise<number[][]> {
  const results = await Promise.all(
    texts.map(async (text) => {
      const res = await embModel.embedContent(text)
      return res.embedding.values
    })
  )
  return results
}

async function main() {
  console.log('Fetching candidates without embeddings...')

  let offset = 0
  let total = 0

  while (true) {
    const { data, error } = await db
      .from('candidates')
      .select('id, role, seniority, location_city, skills, years_experience, open_to_work, education, experiences')
      .is('embedding', null)
      .range(offset, offset + BATCH_SIZE - 1)

    if (error) { console.error(error.message); process.exit(1) }
    if (!data || data.length === 0) break

    // Embed in chunks of EMBED_CONCURRENCY
    for (let i = 0; i < data.length; i += EMBED_CONCURRENCY) {
      const chunk = data.slice(i, i + EMBED_CONCURRENCY)
      const texts = chunk.map(candidateToText)
      const embeddings = await embedBatch(texts)

      // Update each candidate
      await Promise.all(
        chunk.map((c, j) =>
          db.from('candidates').update({ embedding: JSON.stringify(embeddings[j]) }).eq('id', c.id)
        )
      )
    }

    total += data.length
    console.log(`  Embedded ${total} candidates...`)

    if (data.length < BATCH_SIZE) break
    // Don't advance offset since we're filtering is null — processed rows drop out
  }

  console.log(`Done. ${total} embeddings generated.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
