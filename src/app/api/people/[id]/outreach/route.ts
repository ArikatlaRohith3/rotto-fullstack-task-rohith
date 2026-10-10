import { NextRequest } from 'next/server'
import { getAuthContext, unauthorized } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/service'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY ?? '')

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await getAuthContext(req)
  if (!auth) return unauthorized()

  const { id } = await params
  const supabase = createServiceClient()

  const { data: candidate } = await supabase
    .from('candidates')
    .select('full_name, current_title, current_company, role, seniority, location_city, skills, years_experience, open_to_work')
    .eq('id', id)
    .single()

  if (!candidate) return Response.json({ error: 'Candidate not found' }, { status: 404 })

  let body: { recruiterName?: string; companyName?: string; roleTitle?: string } = {}
  try { body = await req.json() } catch { /* optional body */ }

  const skillsList = Array.isArray(candidate.skills)
    ? (candidate.skills as string[]).slice(0, 6).join(', ')
    : ''

  const model = genAI.getGenerativeModel({ model: 'gemini-3.8-flash' })

  const prompt = `Write a personalized, concise cold outreach email from a recruiter to a software engineering candidate.

Candidate details:
- Name: ${candidate.full_name}
- Title: ${candidate.current_title ?? candidate.role ?? 'Engineer'}
- Current company: ${candidate.current_company ?? 'not listed'}
- Seniority: ${candidate.seniority ?? 'experienced'}
- Location: ${candidate.location_city ?? 'unknown'}
- Skills: ${skillsList}
- Years experience: ${candidate.years_experience ?? 'several'}
${candidate.open_to_work ? '- Note: actively open to new opportunities' : ''}

Recruiter context:
- Recruiter name: ${body.recruiterName ?? '[Your Name]'}
- Recruiting for company: ${body.companyName ?? '[Your Company]'}
- Open role: ${body.roleTitle ?? `${candidate.seniority ?? 'Senior'} ${candidate.role ?? 'Engineer'}`}

Write a genuine, non-generic 3-paragraph cold outreach email:
1. Opening: introduce yourself and reference ONE specific thing about this candidate (a skill, their background, or their open-to-work status) to show you actually read their profile
2. The opportunity: what's exciting about this role — be specific but brief
3. CTA: a low-pressure ask to hop on a quick call or reply if interested

Requirements:
- Under 150 words total
- Friendly and human, not corporate
- Use actual line breaks between paragraphs
- No subject line in the output
- End with recruiter name and company`

  const result = await model.generateContent(prompt)
  const email = result.response.text().trim()

  return Response.json({ email, candidate_name: candidate.full_name })
}
