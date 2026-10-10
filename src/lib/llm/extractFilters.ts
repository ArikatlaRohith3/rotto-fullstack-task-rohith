import { GoogleGenerativeAI } from '@google/generative-ai'
import { SearchFilters } from '@/lib/types'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

const SYSTEM_PROMPT = `You are a search filter extractor for a recruiting database.
Extract structured search filters from a recruiter's plain-English brief.

The database has exactly these fields per candidate:
- location_city: city name (e.g. "New York", "San Francisco", "Austin", "Seattle", "Boston")
- skills: array of specific technologies/tools (e.g. "React", "Go", "Kubernetes", "Python", "TypeScript")
- seniority: one of exactly: "junior", "mid", "senior", "staff", "lead", "principal"
- role: job role category (e.g. "Frontend Engineer", "Backend Engineer", "Full Stack Engineer", "Data Scientist", "Product Designer", "DevOps Engineer", "Machine Learning Engineer", "Mobile Engineer")
- open_to_work: boolean
- company_type: "startup" or "enterprise" (from work history)
- education.degree: exactly "BS", "MS", "PhD", or "MBA"
- education.school: school/university name
- years_experience: integer number of years

Rules:
1. Only extract filters EXPLICITLY stated or directly implied in the brief
2. Never invent or guess filters not mentioned
3. Seniority mapping: "junior"→"junior", "mid/middle"→"mid", "senior"→"senior", "staff"→"staff", "lead"→"lead", "principal"→"principal"
4. For location, use only the city name (not state/country)
5. Skills must exactly match technology names (capitalize correctly: React not react, Go not golang)
6. If brief mentions "worked at a startup" → company_type: "startup"
7. If brief mentions "open to work" → open_to_work: true
8. For education: "PhD" → education_level: "PhD"; "studied at Stanford" → education_school: "Stanford"
9. Role should match the closest category from the list above
10. Respond ONLY with a valid JSON object. No markdown, no explanation.

Return a JSON object with only the relevant fields from:
{
  "skills": string[],
  "location": string,
  "seniority": "junior"|"mid"|"senior"|"staff"|"lead"|"principal",
  "role": string,
  "open_to_work": boolean,
  "company_type": "startup"|"enterprise",
  "education_level": "BS"|"MS"|"PhD"|"MBA",
  "education_school": string,
  "min_years_experience": number,
  "max_years_experience": number
}`

export async function extractFilters(brief: string): Promise<SearchFilters> {
  // Sanitize input: strip any potential injection attempts
  const sanitized = brief.slice(0, 500).replace(/[<>]/g, '')

  const model = genAI.getGenerativeModel({
    model: 'gemini-3.8-flash',
    systemInstruction: SYSTEM_PROMPT,
  })

  const result = await model.generateContent(`Brief: ${sanitized}`)
  const text = result.response.text()

  // Extract JSON safely – never trust the model output
  const match = text.match(/\{[\s\S]*\}/)
  if (!match) return {}

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(match[0])
  } catch {
    return {}
  }

  // Whitelist only the fields we support
  const filters: SearchFilters = {}
  if (Array.isArray(parsed.skills) && parsed.skills.every((s) => typeof s === 'string'))
    filters.skills = (parsed.skills as string[]).slice(0, 10)
  if (typeof parsed.location === 'string') filters.location = String(parsed.location).slice(0, 100)
  if (typeof parsed.seniority === 'string' && ['junior','mid','senior','staff','lead','principal'].includes(parsed.seniority as string))
    filters.seniority = parsed.seniority as string
  if (typeof parsed.role === 'string') filters.role = String(parsed.role).slice(0, 100)
  if (typeof parsed.open_to_work === 'boolean') filters.open_to_work = parsed.open_to_work
  if (typeof parsed.company_type === 'string' && ['startup','enterprise'].includes(parsed.company_type as string))
    filters.company_type = parsed.company_type as string
  if (typeof parsed.education_level === 'string' && ['BS','MS','PhD','MBA'].includes(parsed.education_level as string))
    filters.education_level = parsed.education_level as string
  if (typeof parsed.education_school === 'string') filters.education_school = String(parsed.education_school).slice(0, 100)
  if (typeof parsed.min_years_experience === 'number' && parsed.min_years_experience >= 0)
    filters.min_years_experience = Math.floor(parsed.min_years_experience as number)
  if (typeof parsed.max_years_experience === 'number' && parsed.max_years_experience >= 0)
    filters.max_years_experience = Math.floor(parsed.max_years_experience as number)

  return filters
}
