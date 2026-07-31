"use client"

import { useActionState, useTransition } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { formatEnumLabel } from "@/lib/api/employees"
import type { WorkExperience } from "@/lib/api/professional-profile"
import { addWorkExperience, removeWorkExperience, type ActionState } from "@/lib/api/professional-profile-actions"

const EMPLOYMENT_TYPES = ["PERMANENT", "TEMPORARY", "CONTRACT", "INTERNSHIP", "CONSULTANCY"] as const

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { month: "short", year: "numeric" })
}

export function ExperienceSection({ employeeId, experience, editable }: { employeeId: string; experience: WorkExperience[]; editable: boolean }) {
  const addAction = addWorkExperience.bind(null, employeeId)
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(addAction, undefined)
  const [removing, startTransition] = useTransition()

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Experience</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {experience.length === 0 ? (
          <p className="text-sm text-muted-foreground">No work experience added yet.</p>
        ) : (
          <ol className="flex flex-col gap-4 border-l border-border pl-4">
            {experience.map((exp) => (
              <li key={exp.id} className="relative">
                <span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-primary" />
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground">
                      {formatDate(exp.startDate)} — {exp.isCurrent ? "Present" : exp.endDate ? formatDate(exp.endDate) : "—"}
                    </p>
                    <p className="font-medium text-foreground">{exp.jobTitle}</p>
                    <p className="text-sm text-muted-foreground">
                      {exp.companyName}
                      {exp.location ? ` · ${exp.location}` : ""}
                    </p>
                    <Badge variant="secondary" className="mt-1">
                      {formatEnumLabel(exp.employmentType)}
                    </Badge>
                    {exp.description ? <p className="mt-2 text-sm text-muted-foreground">{exp.description}</p> : null}
                    {exp.skillsUsed.length > 0 ? (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {exp.skillsUsed.map((skill) => (
                          <Badge key={skill} variant="outline">
                            {skill}
                          </Badge>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  {editable ? (
                    <button
                      type="button"
                      disabled={removing}
                      className="shrink-0 text-xs font-medium text-destructive hover:underline"
                      onClick={() => startTransition(() => removeWorkExperience(exp.id, employeeId))}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ol>
        )}

        {editable ? (
          <form action={formAction} className="flex flex-col gap-3 border-t border-border pt-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <Label htmlFor="companyName" className="text-xs text-muted-foreground">
                  Company / Organization
                </Label>
                <Input id="companyName" name="companyName" required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="jobTitle" className="text-xs text-muted-foreground">
                  Job Title / Position
                </Label>
                <Input id="jobTitle" name="jobTitle" required />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <div className="flex flex-col gap-1">
                <Label htmlFor="employmentType" className="text-xs text-muted-foreground">
                  Employment Type
                </Label>
                <Select id="employmentType" name="employmentType" defaultValue="" required>
                  <option value="" disabled>
                    Select…
                  </option>
                  {EMPLOYMENT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {formatEnumLabel(type)}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="location" className="text-xs text-muted-foreground">
                  Location
                </Label>
                <Input id="location" name="location" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="industry" className="text-xs text-muted-foreground">
                  Industry
                </Label>
                <Input id="industry" name="industry" />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="skillsUsed" className="text-xs text-muted-foreground">
                  Skills Used (comma-separated)
                </Label>
                <Input id="skillsUsed" name="skillsUsed" placeholder="SQL, Leadership" />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="flex flex-col gap-1">
                <Label htmlFor="exp-startDate" className="text-xs text-muted-foreground">
                  Start Date
                </Label>
                <Input id="exp-startDate" name="startDate" type="date" required />
              </div>
              <div className="flex flex-col gap-1">
                <Label htmlFor="exp-endDate" className="text-xs text-muted-foreground">
                  End Date
                </Label>
                <Input id="exp-endDate" name="endDate" type="date" />
              </div>
              <div className="flex items-end gap-2 pb-1.5">
                <input id="isCurrent" name="isCurrent" type="checkbox" className="size-4 rounded border-input" />
                <Label htmlFor="isCurrent" className="font-normal">
                  Currently working here
                </Label>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <Label htmlFor="exp-description" className="text-xs text-muted-foreground">
                Responsibilities / Description
              </Label>
              <Textarea id="exp-description" name="description" rows={2} />
            </div>

            {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}

            <Button type="submit" size="sm" disabled={pending} className="self-start">
              {pending ? "Adding…" : "Add experience"}
            </Button>
          </form>
        ) : null}
      </CardContent>
    </Card>
  )
}
