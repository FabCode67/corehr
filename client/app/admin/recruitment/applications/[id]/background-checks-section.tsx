"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { createBackgroundCheck, updateBackgroundCheckStatus } from "@/lib/api/recruitment-actions"
import type { BackgroundCheck, BackgroundCheckType } from "@/lib/api/recruitment"

const TYPES: BackgroundCheckType[] = [
  "EMPLOYMENT_VERIFICATION",
  "EDUCATION_VERIFICATION",
  "CRIMINAL_RECORD_CHECK",
  "PROFESSIONAL_REFERENCES",
  "IDENTITY_VERIFICATION",
]

function StatusControl({ check, actingEmployeeId }: { check: BackgroundCheck; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onChange(status: string) {
    setError(null)
    startTransition(async () => {
      const result = await updateBackgroundCheckStatus(check.id, actingEmployeeId, status)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Select value={check.status} disabled={pending} onChange={(event) => onChange(event.target.value)} className="w-32">
        <option value="PENDING">Pending</option>
        <option value="PASSED">Passed</option>
        <option value="FAILED">Failed</option>
      </Select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function NewCheckForm({ applicationId, actingEmployeeId }: { applicationId: string; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [type, setType] = useState<BackgroundCheckType>("EMPLOYMENT_VERIFICATION")

  function submit() {
    setError(null)
    startTransition(async () => {
      const result = await createBackgroundCheck(applicationId, actingEmployeeId, type)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-border p-3">
      <Select value={type} onChange={(event) => setType(event.target.value as BackgroundCheckType)} className="w-56">
        {TYPES.map((value) => (
          <option key={value} value={value}>
            {value.replaceAll("_", " ")}
          </option>
        ))}
      </Select>
      <Button type="button" size="sm" disabled={pending} onClick={submit}>
        {pending ? "Initiating…" : "Initiate check"}
      </Button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

export function BackgroundChecksSection({ applicationId, actingEmployeeId, checks }: { applicationId: string; actingEmployeeId: string; checks: BackgroundCheck[] }) {
  return (
    <div className="flex flex-col gap-3">
      {checks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No background checks yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {checks.map((check) => (
            <li key={check.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
              <div>
                <p className="font-medium text-foreground">{check.checkType.replaceAll("_", " ")}</p>
                {check.completedAt ? (
                  <p className="text-xs text-muted-foreground">Completed {new Date(check.completedAt).toLocaleDateString()}</p>
                ) : null}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={check.status === "PASSED" ? "success" : check.status === "FAILED" ? "destructive" : "outline"}>{check.status}</Badge>
                <StatusControl check={check} actingEmployeeId={actingEmployeeId} />
              </div>
            </li>
          ))}
        </ul>
      )}
      <NewCheckForm applicationId={applicationId} actingEmployeeId={actingEmployeeId} />
    </div>
  )
}
