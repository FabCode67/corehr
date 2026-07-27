"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { createInterview, recordInterviewOutcome } from "@/lib/api/recruitment-actions"
import type { Interview, InterviewType } from "@/lib/api/recruitment"
import type { Employee } from "@/lib/api/employees"

const TYPES: InterviewType[] = ["HR_INTERVIEW", "TECHNICAL_INTERVIEW", "MANAGER_INTERVIEW", "EXECUTIVE_INTERVIEW"]
const RECOMMENDATIONS = ["STRONG_HIRE", "HIRE", "CONSIDER", "DO_NOT_HIRE"] as const

function OutcomeForm({ interview, actingEmployeeId }: { interview: Interview; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [recommendation, setRecommendation] = useState(interview.recommendation ?? "HIRE")
  const [notes, setNotes] = useState(interview.notes ?? "")

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await recordInterviewOutcome(interview.id, actingEmployeeId, recommendation, notes || undefined)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-2 flex flex-col gap-2 border-t border-border pt-2">
      <div className="flex flex-wrap items-end gap-2">
        <Select value={recommendation} onChange={(event) => setRecommendation(event.target.value as typeof recommendation)} className="w-40">
          {RECOMMENDATIONS.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {pending ? "Saving…" : "Record outcome"}
        </Button>
      </div>
      <Textarea placeholder="Notes (optional)" value={notes} onChange={(event) => setNotes(event.target.value)} />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function NewInterviewForm({ applicationId, actingEmployeeId, employees }: { applicationId: string; actingEmployeeId: string; employees: Employee[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<InterviewType>("HR_INTERVIEW")
  const [date, setDate] = useState("")
  const [location, setLocation] = useState("")
  const [panelists, setPanelists] = useState<string[]>([])

  function togglePanelist(employeeNumber: string) {
    setPanelists((current) => (current.includes(employeeNumber) ? current.filter((id) => id !== employeeNumber) : [...current, employeeNumber]))
  }

  function submit() {
    if (!date) {
      setError("Pick a date and time.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await createInterview(applicationId, actingEmployeeId, type, new Date(date).toISOString(), location || undefined, panelists)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Schedule an interview</p>
      <div className="flex flex-wrap items-end gap-2">
        <Select value={type} onChange={(event) => setType(event.target.value as InterviewType)} className="w-44">
          {TYPES.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
        <Input type="datetime-local" value={date} onChange={(event) => setDate(event.target.value)} className="w-52" />
        <Input placeholder="Location (optional)" value={location} onChange={(event) => setLocation(event.target.value)} className="w-40" />
      </div>
      <div className="flex flex-wrap gap-2 text-xs">
        {employees.map((employee) => (
          <label key={employee.employeeNumber} className="flex items-center gap-1 rounded-full border border-border px-2 py-1">
            <input type="checkbox" checked={panelists.includes(employee.employeeNumber)} onChange={() => togglePanelist(employee.employeeNumber)} />
            {employee.firstName} {employee.lastName}
          </label>
        ))}
      </div>
      <div>
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {pending ? "Scheduling…" : "Schedule"}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export function InterviewsSection({
  applicationId,
  actingEmployeeId,
  interviews,
  employees,
}: {
  applicationId: string
  actingEmployeeId: string
  interviews: Interview[]
  employees: Employee[]
}) {
  return (
    <div className="flex flex-col gap-3">
      {interviews.length === 0 ? (
        <p className="text-sm text-muted-foreground">No interviews scheduled yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {interviews.map((interview) => (
            <li key={interview.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{interview.interviewType.replaceAll("_", " ")}</span>
                <Badge variant={interview.status === "COMPLETED" ? "success" : interview.status === "CANCELLED" ? "destructive" : "outline"}>
                  {interview.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(interview.interviewDate).toLocaleString()}
                {interview.location ? ` · ${interview.location}` : ""}
              </p>
              {interview.panelists.length > 0 ? (
                <p className="mt-1 text-xs text-muted-foreground">
                  Panel: {interview.panelists.map((panelist) => `${panelist.employee.firstName} ${panelist.employee.lastName}`).join(", ")}
                </p>
              ) : null}
              {interview.recommendation ? (
                <p className="mt-1 text-xs text-foreground">Recommendation: {interview.recommendation.replaceAll("_", " ")}</p>
              ) : null}
              {interview.status !== "CANCELLED" ? <OutcomeForm interview={interview} actingEmployeeId={actingEmployeeId} /> : null}
            </li>
          ))}
        </ul>
      )}
      <NewInterviewForm applicationId={applicationId} actingEmployeeId={actingEmployeeId} employees={employees} />
    </div>
  )
}
