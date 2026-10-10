import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')
const model = genAI.getGenerativeModel({ model: 'text-embedding-004' })

export async function embedText(text: string): Promise<number[]> {
  const sanitized = text.slice(0, 500)
  const result = await model.embedContent(sanitized)
  return result.embedding.values
}
