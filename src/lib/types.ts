export interface Company {
  id: string
  name: string
  slug: string
  plan: 'free' | 'paid'
  searches_used: number
}

export interface Recruiter {
  id: string
  company_id: string
}

export interface Candidate {
  id: string
  full_name: string
  avatar_url: string | null
  headline: string | null
  current_title: string | null
  current_company: string | null
  current_company_logo_url: string | null
  role: string | null
  seniority: string | null
  years_experience: number | null
  location_city: string | null
  location_state: string | null
  location_country: string | null
  open_to_work: boolean
  skills: string[]
  experiences: Experience[]
  education: Education[]
}

export interface Experience {
  title: string
  company: string
  company_logo_url?: string
  company_type?: 'startup' | 'enterprise' | string
  start_year: number
  end_year: number | null
  description?: string
}

export interface Education {
  school: string
  degree: string
  field?: string
  graduation_year?: number
}

export interface SearchFilters {
  skills?: string[]
  location?: string
  seniority?: string
  role?: string
  open_to_work?: boolean
  company_type?: string
  education_level?: string
  education_school?: string
  min_years_experience?: number
  max_years_experience?: number
}

export interface SearchResult {
  search_id: string
  filters: SearchFilters
  total: number
  results: CandidateSummary[]
  searches_remaining: number | null
}

export interface CandidateSummary {
  id: string
  full_name: string
  avatar_url: string | null
  headline: string | null
  current_title: string | null
  current_company: string | null
  current_company_logo_url: string | null
  role: string | null
  seniority: string | null
  years_experience: number | null
  location_city: string | null
  location_state: string | null
  skills: string[]
  open_to_work: boolean
  score?: number
}

export interface Shortlist {
  id: string
  company_id: string
  name: string
  created_at: string
}

export interface SavedBrief {
  id: string
  company_id: string
  recruiter_id: string
  brief: string
  filters: SearchFilters
  created_at: string
}
