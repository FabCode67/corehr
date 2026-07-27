"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Select } from "@/components/ui/select"
import { APPLICATION_STATUS_LABELS, type ApplicationStatus } from "@/lib/api/recruitment"
import { updateApplicationStatus } from "@/lib/api/recruitment-actions"

const STATUSES: ApplicationStatus[] = ["APPLIED", "UNDER_REVIEW", "SHORTLISTED", "INTERVIEW", "OFFER", "HIRED", "REJECTED", "WITHDRAWN"]

export function StatusSelect({ applicationId, actingEmployeeId, status }: { applicationId: string; actingEmployeeId: string; status: ApplicationStatus }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function onChange(next: string) {
    setError(null)
    startTransition(async () => {
      const result = await updateApplicationStatus(applicationId, actingEmployeeId, next)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Select value={status} disabled={pending} onChange={(event) => onChange(event.target.value)} className="w-44">
        {STATUSES.map((value) => (
          <option key={value} value={value}>
            {APPLICATION_STATUS_LABELS[value]}
          </option>
        ))}
      </Select>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
