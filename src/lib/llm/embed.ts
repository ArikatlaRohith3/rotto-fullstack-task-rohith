// Gemini embedding via REST — outputDimensionality not yet in SDK types
const EMBED_URL = (key: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2:embedContent?key=${key}`

export async function embedText(text: string): Promise<number[]> {
  const key = process.env.GEMINI_API_KEY ?? ''
  const res = await fetch(EMBED_URL(key), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      content: { parts: [{ text: text.slice(0, 500) }] },
      outputDimensionality: 1536,
    }),
  })
  if (!res.ok) throw new Error(`Embed failed: ${res.status}`)
  const json = await res.json() as { embedding: { values: number[] } }
  return json.embedding.values
}
