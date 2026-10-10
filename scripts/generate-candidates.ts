/**
 * Generates 50K synthetic candidates and inserts them into the database.
 * Run: npx ts-node --project tsconfig.scripts.json scripts/generate-candidates.ts [count]
 * Default count: 50000
 */
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!
const db = createClient(SUPABASE_URL, SERVICE_KEY)

const TARGET = parseInt(process.argv[2] ?? '50000', 10)
const BATCH = 500

// --- Seed data pools ---

const FIRST_NAMES = [
  'Alex','Jordan','Taylor','Morgan','Casey','Riley','Drew','Quinn','Avery','Blake',
  'Cameron','Dana','Dylan','Emery','Finley','Harper','Hayden','Jamie','Jesse','Kai',
  'Lane','Logan','Mackenzie','Madison','Mason','Maxwell','Micah','Parker','Peyton',
  'Reagan','Reese','River','Rowan','Ryan','Sage','Sam','Sawyer','Skylar','Spencer',
  'Tatum','Tyler','Whitney','Wren','Abby','Adam','Ava','Ben','Bella','Carlos',
  'Charlotte','Daniel','Emma','Ethan','Fiona','Grace','Henry','Isabella','Jack',
  'Julia','Kevin','Laura','Liam','Luna','Marcus','Maya','Nathan','Natalie','Olivia',
  'Owen','Priya','Rachel','Sarah','Sofia','Thomas','Victor','Wendy','Xavier','Yuki',
  'Aisha','Dmitri','Fatima','Hiroshi','Ingrid','Jasper','Kenji','Layla','Miguel',
  'Nadia','Oscar','Penelope','Quentin','Simone','Tariq','Ursula','Valentina','Zara',
]

const LAST_NAMES = [
  'Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Rodriguez',
  'Martinez','Hernandez','Lopez','Gonzalez','Wilson','Anderson','Thomas','Taylor',
  'Moore','Jackson','Martin','Lee','Perez','Thompson','White','Harris','Sanchez',
  'Clark','Ramirez','Lewis','Robinson','Walker','Young','Allen','King','Wright',
  'Scott','Torres','Nguyen','Hill','Flores','Green','Adams','Nelson','Baker',
  'Rivera','Campbell','Mitchell','Carter','Roberts','Chen','Kim','Patel','Singh',
  'Kumar','Shah','Wu','Zhang','Wang','Liu','Li','Park','Tanaka','Yamamoto',
  'Nakamura','Sato','Kobayashi','Ito','Watanabe','Okonkwo','Diallo','Mensah',
  'Ibrahim','Hassan','Ali','Mohamed','Ahmed','Osei','Adeyemi','Kowalski','Müller',
  'Andersen','Johansson','Nielsen','Petersen','Eriksson','Christensen','Larsson',
]

const ROLES = [
  'Frontend Engineer','Backend Engineer','Full Stack Engineer','Data Scientist',
  'Machine Learning Engineer','DevOps Engineer','Mobile Engineer','Product Designer',
  'Security Engineer','QA Engineer','Platform Engineer','Site Reliability Engineer',
  'Data Engineer','Engineering Manager','Technical Lead','iOS Engineer',
  'Android Engineer','Infrastructure Engineer','Staff Engineer','Principal Engineer',
]

const SENIORITIES: string[] = ['junior','mid','senior','staff','lead','principal']
const SENIORITY_WEIGHTS = [0.20, 0.30, 0.28, 0.12, 0.06, 0.04]

const CITIES = [
  'New York','San Francisco','Austin','Seattle','Boston','Chicago','Denver',
  'Atlanta','Los Angeles','Miami','Portland','Phoenix','Dallas','Minneapolis',
  'Washington DC','San Diego','Nashville','Raleigh','Detroit','Philadelphia',
  'Pittsburgh','Salt Lake City','Baltimore','Orlando','Tampa','Charlotte',
  'Indianapolis','Columbus','Kansas City','Sacramento','Houston','San Jose',
  'Oakland','Brooklyn','Jersey City','Cambridge','Somerville','Bellevue',
  'Redmond','Kirkland','Boulder','Fort Collins','Tempe','Scottsdale','Plano',
]

const SKILLS_BY_ROLE: Record<string, string[]> = {
  'Frontend Engineer': ['React','TypeScript','JavaScript','Vue','Angular','Next.js','CSS','HTML','Webpack','Jest','Storybook','GraphQL','Redux','Tailwind','Vite'],
  'Backend Engineer': ['Node.js','Python','Go','Java','Ruby','C#','PostgreSQL','MongoDB','Redis','GraphQL','gRPC','REST','MySQL','Kafka','RabbitMQ','Rust'],
  'Full Stack Engineer': ['React','Node.js','TypeScript','PostgreSQL','Python','Next.js','Docker','GraphQL','Redis','MongoDB','Tailwind','Prisma'],
  'Data Scientist': ['Python','R','SQL','TensorFlow','PyTorch','Scikit-learn','Pandas','NumPy','Jupyter','Spark','Tableau','Statistics','Machine Learning','NLP'],
  'Machine Learning Engineer': ['Python','TensorFlow','PyTorch','Kubernetes','Docker','MLflow','Airflow','Spark','CUDA','Scikit-learn','Hugging Face','LangChain','Ray'],
  'DevOps Engineer': ['Kubernetes','Docker','Terraform','AWS','GCP','Azure','Helm','Prometheus','Grafana','Ansible','Jenkins','ArgoCD','GitHub Actions','Datadog'],
  'Mobile Engineer': ['Swift','Kotlin','React Native','Flutter','iOS','Android','SwiftUI','Jetpack Compose','Firebase','Xcode'],
  'Product Designer': ['Figma','Sketch','Adobe XD','Zeplin','InVision','User Research','Prototyping','Design Systems','Accessibility','A/B Testing'],
  'Security Engineer': ['Python','Go','Penetration Testing','SIEM','IAM','Zero Trust','Kubernetes','Terraform','SOC','Threat Modeling','OWASP'],
  'QA Engineer': ['Selenium','Cypress','Jest','Playwright','Python','Java','TestRail','Postman','Performance Testing','API Testing'],
  'Platform Engineer': ['Kubernetes','Terraform','AWS','Go','Python','Helm','ArgoCD','Prometheus','Kafka','PostgreSQL','Redis'],
  'Site Reliability Engineer': ['Kubernetes','Terraform','Go','Python','Prometheus','Grafana','PagerDuty','AWS','GCP','Incident Management','Chaos Engineering'],
  'Data Engineer': ['Python','SQL','Spark','Airflow','dbt','Kafka','Snowflake','BigQuery','PostgreSQL','Databricks','Hadoop','Flink'],
  'Engineering Manager': ['System Design','Agile','Roadmapping','TypeScript','Python','Go','Architecture','Team Building','OKRs'],
  'Technical Lead': ['System Design','Architecture','TypeScript','Python','Go','Java','Mentoring','Code Review','Microservices'],
  'iOS Engineer': ['Swift','SwiftUI','Xcode','Objective-C','Core Data','Firebase','TestFlight','App Store','Combine','UIKit'],
  'Android Engineer': ['Kotlin','Java','Android SDK','Jetpack Compose','Firebase','Room','Coroutines','MVVM','Retrofit'],
  'Infrastructure Engineer': ['Terraform','AWS','GCP','Azure','Kubernetes','Docker','Ansible','Packer','Consul','Vault'],
  'Staff Engineer': ['System Design','Architecture','TypeScript','Python','Go','Java','Technical Strategy','Mentoring','Distributed Systems'],
  'Principal Engineer': ['System Design','Architecture','Technical Strategy','Go','Python','Java','Distributed Systems','Mentoring','OSS'],
}

const STARTUP_COMPANIES = [
  'Stripe','Airbnb','Figma','Notion','Linear','Vercel','PlanetScale','Clerk',
  'Railway','Tailscale','Deno Land','Bun','Turso','Neon','Prisma','Resend',
  'Upstash','Liveblocks','Supabase','Fly.io','Render','Descript','Loom',
  'Coda','Airtable','Webflow','Framer','Stytch','Ory','Zitadel',
  'PostHog','Plausible','Umami','Cal.com','Trigger.dev','Inngest',
  'Expo','Ionic','Capacitor','Tauri','Dioxus','Leptos',
]

const ENTERPRISE_COMPANIES = [
  'Google','Amazon','Microsoft','Meta','Apple','Netflix','Salesforce','Oracle',
  'IBM','Cisco','Adobe','Intuit','Workday','ServiceNow','Snowflake','Databricks',
  'Palantir','Shopify','Atlassian','MongoDB','HashiCorp','Elastic','Confluent',
  'Twilio','SendGrid','Okta','Auth0','Datadog','New Relic','Splunk',
  'VMware','Dell','HP','SAP','Accenture','Deloitte','McKinsey','KPMG',
  'JPMorgan','Goldman Sachs','Morgan Stanley','Bank of America','Citi',
  'UnitedHealth','Johnson & Johnson','Pfizer','Merck','AstraZeneca',
]

const SCHOOLS = [
  'MIT','Stanford','Carnegie Mellon','UC Berkeley','Georgia Tech',
  'University of Washington','Cornell','Princeton','Harvard','Yale',
  'Columbia','NYU','Michigan','Illinois','Purdue','UT Austin','UCLA','USC',
  'Northwestern','Duke','Caltech','Virginia Tech','Penn State','Ohio State',
  'Maryland','Wisconsin','Minnesota','Arizona State','UC San Diego','UC Davis',
  'Boston University','Northeastern','Drexel','RPI','Rochester','Rice',
  'Vanderbilt','Notre Dame','Georgetown','Emory','Wake Forest','Tulane',
  'Santa Clara','Cal Poly','San Jose State','Portland State','University of Denver',
]

const DEGREES: Array<'BS' | 'MS' | 'PhD' | 'MBA'> = ['BS', 'MS', 'PhD', 'MBA']

// --- Simple deterministic PRNG (mulberry32) ---
function makePrng(seed: number) {
  let s = seed
  return () => {
    s |= 0; s = s + 0x6D2B79F5 | 0
    let z = Math.imul(s ^ s >>> 15, 1 | s)
    z = z + Math.imul(z ^ z >>> 7, 61 | z) ^ z
    return ((z ^ z >>> 14) >>> 0) / 4294967296
  }
}

function pick<T>(arr: T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length)]
}

function pickWeighted(items: string[], weights: number[], rng: () => number): string {
  const total = weights.reduce((a, b) => a + b, 0)
  let r = rng() * total
  for (let i = 0; i < items.length; i++) {
    r -= weights[i]
    if (r <= 0) return items[i]
  }
  return items[items.length - 1]
}

function sample<T>(arr: T[], n: number, rng: () => number): T[] {
  const shuffled = [...arr].sort(() => rng() - 0.5)
  return shuffled.slice(0, n)
}

function generateCandidate(index: number) {
  const rng = makePrng(index * 2654435761)
  const firstName = pick(FIRST_NAMES, rng)
  const lastName = pick(LAST_NAMES, rng)
  const role = pick(ROLES, rng)
  const seniority = pickWeighted(SENIORITIES, SENIORITY_WEIGHTS, rng)

  const seniorityYears: Record<string, [number, number]> = {
    junior: [0, 2], mid: [2, 5], senior: [5, 10],
    staff: [8, 15], lead: [8, 18], principal: [12, 25],
  }
  const [minY, maxY] = seniorityYears[seniority]
  const years_experience = minY + Math.floor(rng() * (maxY - minY + 1))

  const city = pick(CITIES, rng)
  const skillPool = SKILLS_BY_ROLE[role] ?? SKILLS_BY_ROLE['Full Stack Engineer']
  const numSkills = 3 + Math.floor(rng() * 5)
  const skills = sample(skillPool, Math.min(numSkills, skillPool.length), rng)

  // Build work experience (1-3 jobs)
  const numJobs = 1 + Math.floor(rng() * 3)
  const experiences = Array.from({ length: numJobs }, (_, j) => {
    const isStartup = rng() > 0.5
    const company = isStartup ? pick(STARTUP_COMPANIES, rng) : pick(ENTERPRISE_COMPANIES, rng)
    const jobYears = 1 + Math.floor(rng() * 4)
    return {
      company,
      company_type: isStartup ? 'startup' : 'enterprise',
      title: `${seniority.charAt(0).toUpperCase() + seniority.slice(1)} ${role}`,
      years: jobYears,
    }
  })

  // Education
  const numDegrees = rng() > 0.4 ? 2 : 1
  const education = Array.from({ length: numDegrees }, (_, k) => {
    const degree = k === 0 ? 'BS' : pick(['MS', 'PhD', 'MBA'], rng) as 'BS'|'MS'|'PhD'|'MBA'
    const school = pick(SCHOOLS, rng)
    const gradYear = 2024 - years_experience - (k * 2) - Math.floor(rng() * 3)
    return { degree, school, year: gradYear }
  })

  return {
    id: `gen_${String(index).padStart(5, '0')}`,
    full_name: `${firstName} ${lastName}`,
    role,
    seniority,
    location_city: city,
    skills,
    years_experience,
    open_to_work: rng() > 0.6,
    experiences,
    education,
  }
}

async function main() {
  console.log(`Generating ${TARGET} synthetic candidates...`)

  let inserted = 0
  for (let start = 1; start <= TARGET; start += BATCH) {
    const end = Math.min(start + BATCH - 1, TARGET)
    const batch = Array.from({ length: end - start + 1 }, (_, i) =>
      generateCandidate(start + i)
    )

    const { error } = await db.from('candidates').upsert(batch, { onConflict: 'id' })
    if (error) {
      console.error(`Batch ${start}-${end} failed:`, error.message)
      process.exit(1)
    }

    inserted += batch.length
    if (inserted % 5000 === 0 || inserted === TARGET) {
      console.log(`  ${inserted} / ${TARGET} inserted`)
    }
  }

  console.log(`Done. ${inserted} candidates inserted.`)
}

main().catch((e) => { console.error(e); process.exit(1) })
