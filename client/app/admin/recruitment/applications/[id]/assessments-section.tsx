"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { createAssessment, recordAssessmentResult } from "@/lib/api/recruitment-actions"
import type { Assessment, AssessmentType } from "@/lib/api/recruitment"
import type { Employee } from "@/lib/api/employees"

const TYPES: AssessmentType[] = ["TECHNICAL_TEST", "APTITUDE_TEST", "PRACTICAL_EXERCISE", "PSYCHOMETRIC_ASSESSMENT", "COMPLIANCE_TEST"]

function ResultForm({ assessment, actingEmployeeId }: { assessment: Assessment; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [score, setScore] = useState(assessment.score?.toString() ?? "")
  const [maxScore, setMaxScore] = useState(assessment.maxScore?.toString() ?? "100")
  const [result, setResult] = useState(assessment.result)

  function submit() {
    setError(null)
    startTransition(async () => {
      const outcome = await recordAssessmentResult(
        assessment.id,
        actingEmployeeId,
        result,
        score ? Number(score) : undefined,
        maxScore ? Number(maxScore) : undefined
      )
      if (outcome?.error) {
        setError(outcome.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-2 flex flex-wrap items-end gap-2 border-t border-border pt-2">
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Score</label>
        <Input type="number" value={score} onChange={(event) => setScore(event.target.value)} className="w-20" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Max</label>
        <Input type="number" value={maxScore} onChange={(event) => setMaxScore(event.target.value)} className="w-20" />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs text-muted-foreground">Result</label>
        <Select value={result} onChange={(event) => setResult(event.target.value as Assessment["result"])} className="w-28">
          <option value="PENDING">Pending</option>
          <option value="PASS">Pass</option>
          <option value="FAIL">Fail</option>
        </Select>
      </div>
      <Button type="button" size="sm" disabled={pending} onClick={submit}>
        {pending ? "Saving…" : "Save result"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function NewAssessmentForm({ applicationId, actingEmployeeId, employees }: { applicationId: string; actingEmployeeId: string; employees: Employee[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<AssessmentType>("TECHNICAL_TEST")
  const [scheduledDate, setScheduledDate] = useState("")
  const [evaluatorId, setEvaluatorId] = useState("")

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await createAssessment(applicationId, actingEmployeeId, type, scheduledDate || undefined, evaluatorId || undefined)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Schedule an assessment</p>
      <div className="flex flex-wrap items-end gap-2">
        <Select value={type} onChange={(event) => setType(event.target.value as AssessmentType)} className="w-48">
          {TYPES.map((value) => (
            <option key={value} value={value}>
              {value.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
        <Input type="date" value={scheduledDate} onChange={(event) => setScheduledDate(event.target.value)} className="w-40" />
        <Select value={evaluatorId} onChange={(event) => setEvaluatorId(event.target.value)} className="w-48">
          <option value="">Evaluator (optional)</option>
          {employees.map((employee) => (
            <option key={employee.employeeNumber} value={employee.employeeNumber}>
              {employee.firstName} {employee.lastName}
            </option>
          ))}
        </Select>
        <Button type="button" size="sm" disabled={pending} onClick={submit}>
          {pending ? "Scheduling…" : "Schedule"}
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export function AssessmentsSection({
  applicationId,
  actingEmployeeId,
  assessments,
  employees,
}: {
  applicationId: string
  actingEmployeeId: string
  assessments: Assessment[]
  employees: Employee[]
}) {
  return (
    <div className="flex flex-col gap-3">
      {assessments.length === 0 ? (
        <p className="text-sm text-muted-foreground">No assessments yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {assessments.map((assessment) => (
            <li key={assessment.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{assessment.assessmentType.replaceAll("_", " ")}</span>
                <Badge variant={assessment.result === "PASS" ? "success" : assessment.result === "FAIL" ? "destructive" : "outline"}>
                  {assessment.result}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {assessment.score != null ? `Score: ${assessment.score}/${assessment.maxScore ?? "?"}` : "No score recorded"}
                {assessment.evaluator ? ` · Evaluator: ${assessment.evaluator.firstName} ${assessment.evaluator.lastName}` : ""}
              </p>
              <ResultForm assessment={assessment} actingEmployeeId={actingEmployeeId} />
            </li>
          ))}
        </ul>
      )}
      <NewAssessmentForm applicationId={applicationId} actingEmployeeId={actingEmployeeId} employees={employees} />
    </div>
  )
}
