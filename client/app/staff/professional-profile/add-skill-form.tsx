"use client"

import { useEffect, useRef, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { addCustomSkill, assignSkillToEmployee, searchSkillsAction } from "@/lib/api/professional-profile-actions"
import type { Skill, SkillLevel } from "@/lib/api/professional-profile"

const LEVELS: SkillLevel[] = ["BEGINNER", "INTERMEDIATE", "ADVANCED", "EXPERT"]

export function AddSkillForm({ employeeId, actingEmployeeId }: { employeeId: string; actingEmployeeId: string }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Skill[]>([])
  const [level, setLevel] = useState<SkillLevel>("INTERMEDIATE")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!query || query.trim().length < 1) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setResults(await searchSkillsAction(query))
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query])

  function addSkill(skill: Skill) {
    setError(null)
    startTransition(async () => {
      try {
        await assignSkillToEmployee(employeeId, skill.id, level)
        setQuery("")
        setResults([])
      } catch {
        setError("Failed to add this skill — it may already be on your profile.")
      }
    })
  }

  function addCustom() {
    const name = query.trim()
    if (!name) return
    setError(null)
    startTransition(async () => {
      try {
        const skill = await addCustomSkill(actingEmployeeId, name)
        await assignSkillToEmployee(employeeId, skill.id, level)
        setQuery("")
        setResults([])
      } catch {
        setError("Failed to add this skill.")
      }
    })
  }

  return (
    <div className="flex flex-col gap-2 border-t border-border pt-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Skill</label>
          <Input placeholder="Search or type a new skill…" value={query} onChange={(e) => setQuery(e.target.value)} className="w-56" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Level</label>
          <Select value={level} onChange={(e) => setLevel(e.target.value as SkillLevel)}>
            {LEVELS.map((l) => (
              <option key={l} value={l}>
                {l[0] + l.slice(1).toLowerCase()}
              </option>
            ))}
          </Select>
        </div>
        {query.trim() && !results.some((r) => r.name.toLowerCase() === query.trim().toLowerCase()) ? (
          <Button type="button" size="sm" disabled={pending} onClick={addCustom}>
            {pending ? "Adding…" : `Add "${query.trim()}"`}
          </Button>
        ) : null}
      </div>

      {results.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {results.map((skill) => (
            <li key={skill.id}>
              <button
                type="button"
                disabled={pending}
                onClick={() => addSkill(skill)}
                className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium hover:bg-muted"
              >
                + {skill.name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
