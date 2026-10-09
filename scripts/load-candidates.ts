import * as fs from 'fs'
import * as path from 'path'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!SERVICE_ROLE_KEY) {
  console.error('SUPABASE_SERVICE_ROLE_KEY is required')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

interface RawCandidate {
  id: string
  full_name: string
  avatar_url: string
  headline: string
  current_title: string
  current_company: string
  current_company_logo_url: string
  role: string
  seniority: string
  years_experience: number
  location: { city: string; state: string; country: string }
  open_to_work: boolean
  skills: string[]
  experiences: unknown[]
  education: unknown[]
}

async function loadCandidates() {
  const dataPath = path.join(__dirname, '..', 'data', 'candidates.json')

  if (!fs.existsSync(dataPath)) {
    console.error(`candidates.json not found at ${dataPath}`)
    console.error('Please copy candidates.json into the data/ directory.')
    process.exit(1)
  }

  const raw: RawCandidate[] = JSON.parse(fs.readFileSync(dataPath, 'utf-8'))
  console.log(`Loading ${raw.length} candidates...`)

  const BATCH = 500
  for (let i = 0; i < raw.length; i += BATCH) {
    const batch = raw.slice(i, i + BATCH).map((c) => ({
      id: c.id,
      full_name: c.full_name,
      avatar_url: c.avatar_url,
      headline: c.headline,
      current_title: c.current_title,
      current_company: c.current_company,
      current_company_logo_url: c.current_company_logo_url,
      role: c.role,
      seniority: c.seniority,
      years_experience: c.years_experience,
      location_city: c.location?.city ?? null,
      location_state: c.location?.state ?? null,
      location_country: c.location?.country ?? null,
      open_to_work: c.open_to_work ?? false,
      skills: c.skills ?? [],
      experiences: c.experiences ?? [],
      education: c.education ?? [],
    }))

    const { error } = await supabase
      .from('candidates')
      .upsert(batch, { onConflict: 'id' })

    if (error) {
      console.error(`Batch ${i}-${i + BATCH} failed:`, error.message)
      process.exit(1)
    }
    console.log(`  Loaded ${Math.min(i + BATCH, raw.length)} / ${raw.length}`)
  }

  console.log('Done. All candidates loaded.')
}

loadCandidates().catch((e) => { console.error(e); process.exit(1) })
