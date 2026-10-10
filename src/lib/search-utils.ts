import { CandidateSummary, SearchFilters } from './types'

export function computeMatchChips(candidate: CandidateSummary, filters: SearchFilters): string[] {
  const chips: string[] = []
  const skillsLower = candidate.skills.map((s) => s.toLowerCase())

  if (filters.skills?.length) {
    filters.skills.forEach((skill) => {
      if (skillsLower.includes(skill.toLowerCase())) chips.push(skill)
    })
  }
  if (filters.location && candidate.location_city?.toLowerCase().includes(filters.location.toLowerCase())) {
    chips.push(candidate.location_city!)
  }
  if (filters.seniority && candidate.seniority === filters.seniority) {
    chips.push(filters.seniority.charAt(0).toUpperCase() + filters.seniority.slice(1))
  }
  if (filters.open_to_work && candidate.open_to_work) {
    chips.push('Open to work')
  }
  if (
    filters.min_years_experience != null &&
    candidate.years_experience != null &&
    candidate.years_experience >= filters.min_years_experience
  ) {
    chips.push(`${candidate.years_experience}y exp`)
  }
  return chips
}
