"use client"

import { useTransition } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatEnumLabel } from "@/lib/api/employees"
import type { EmployeeSkill } from "@/lib/api/professional-profile"
import { removeEmployeeSkill } from "@/lib/api/professional-profile-actions"

import { AddSkillForm } from "./add-skill-form"

export function SkillsSection({ employeeId, actingEmployeeId, skills, editable }: { employeeId: string; actingEmployeeId: string; skills: EmployeeSkill[]; editable: boolean }) {
  const [pending, startTransition] = useTransition()

  const grouped = new Map<string, EmployeeSkill[]>()
  for (const s of skills) {
    const list = grouped.get(s.skill.category) ?? []
    list.push(s)
    grouped.set(s.skill.category, list)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Skills</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {skills.length === 0 ? (
          <p className="text-sm text-muted-foreground">No skills added yet.</p>
        ) : (
          Array.from(grouped.entries()).map(([category, items]) => (
            <div key={category}>
              <p className="mb-1.5 text-xs font-medium text-muted-foreground uppercase">{category}</p>
              <div className="flex flex-wrap gap-1.5">
                {items.map((s) => (
                  <Badge key={s.id} variant="secondary" className="gap-1.5">
                    {s.skill.name}
                    <span className="text-muted-foreground">· {formatEnumLabel(s.level)}</span>
                    {editable ? (
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => startTransition(() => removeEmployeeSkill(s.id, employeeId))}
                        className="ml-1 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${s.skill.name}`}
                      >
                        ×
                      </button>
                    ) : null}
                  </Badge>
                ))}
              </div>
            </div>
          ))
        )}

        {editable ? <AddSkillForm employeeId={employeeId} actingEmployeeId={actingEmployeeId} /> : null}
      </CardContent>
    </Card>
  )
}
