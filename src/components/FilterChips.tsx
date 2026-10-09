'use client'

import { useState } from 'react'
import { SearchFilters } from '@/lib/types'
import { X, Pencil, Check } from 'lucide-react'

interface Props {
  filters: SearchFilters
  onChange: (filters: SearchFilters) => void
}

type FilterKey = keyof SearchFilters

function FilterLabel(key: FilterKey): string {
  const labels: Record<FilterKey, string> = {
    skills: 'Skills',
    location: 'Location',
    seniority: 'Level',
    role: 'Role',
    open_to_work: 'Open to work',
    company_type: 'Company type',
    education_level: 'Education',
    education_school: 'School',
    min_years_experience: 'Min exp',
    max_years_experience: 'Max exp',
  }
  return labels[key] ?? key
}

function FilterValue(key: FilterKey, value: unknown): string {
  if (key === 'skills' && Array.isArray(value)) return value.join(', ')
  if (key === 'open_to_work') return 'Open to work'
  if (key === 'min_years_experience') return `${value}+ yrs`
  if (key === 'max_years_experience') return `≤${value} yrs`
  return String(value)
}

export default function FilterChips({ filters, onChange }: Props) {
  const [editing, setEditing] = useState<FilterKey | null>(null)
  const [editValue, setEditValue] = useState('')

  const activeFilters = Object.entries(filters).filter(([, v]) =>
    v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0)
  ) as [FilterKey, unknown][]

  if (activeFilters.length === 0) return null

  function removeFilter(key: FilterKey) {
    const next = { ...filters }
    delete next[key]
    onChange(next)
  }

  function startEdit(key: FilterKey, value: unknown) {
    setEditing(key)
    if (key === 'skills' && Array.isArray(value)) setEditValue(value.join(', '))
    else setEditValue(String(value))
  }

  function commitEdit(key: FilterKey) {
    const trimmed = editValue.trim()
    if (!trimmed) {
      removeFilter(key)
    } else {
      let parsed: unknown = trimmed
      if (key === 'skills') parsed = trimmed.split(',').map((s) => s.trim()).filter(Boolean)
      if (key === 'min_years_experience' || key === 'max_years_experience') parsed = parseInt(trimmed) || 0
      if (key === 'open_to_work') parsed = trimmed.toLowerCase() === 'true'
      onChange({ ...filters, [key]: parsed })
    }
    setEditing(null)
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {activeFilters.map(([key, value]) => (
        <div
          key={key}
          className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-full px-3 py-1 text-xs font-medium text-slate-700 shadow-sm group"
        >
          <span className="text-slate-400 mr-0.5">{FilterLabel(key)}:</span>

          {editing === key ? (
            <span className="flex items-center gap-1">
              <input
                autoFocus
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitEdit(key)
                  if (e.key === 'Escape') setEditing(null)
                }}
                className="w-24 border-none outline-none bg-transparent text-xs text-slate-900"
              />
              <button onClick={() => commitEdit(key)} className="text-green-600 hover:text-green-700">
                <Check size={11} />
              </button>
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span>{FilterValue(key, value)}</span>
              <button
                onClick={() => startEdit(key, value)}
                className="opacity-0 group-hover:opacity-100 text-slate-400 hover:text-slate-600 transition ml-0.5"
              >
                <Pencil size={10} />
              </button>
            </span>
          )}

          <button
            onClick={() => removeFilter(key)}
            className="ml-0.5 text-slate-400 hover:text-slate-700 transition"
          >
            <X size={11} />
          </button>
        </div>
      ))}
    </div>
  )
}
