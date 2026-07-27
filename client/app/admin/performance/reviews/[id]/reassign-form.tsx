"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { reassignReviewer } from "@/lib/api/performance-actions"
import type { Employee } from "@/lib/api/employees"

export function ReassignForm({
  reviewId,
  actingEmployeeId,
  employees,
  currentReviewerId,
}: {
  reviewId: string
  actingEmployeeId: string
  employees: Employee[]
  currentReviewerId: string
}) {
  const router = useRouter()
  const [reviewerId, setReviewerId] = useState(currentReviewerId)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleReassign() {
    if (!reviewerId) {
      setError("Select a reviewer.")
      return
    }
    setError(null)
    startTransition(async () => {
      const result = await reassignReviewer(reviewId, actingEmployeeId, reviewerId)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-end gap-3">
      <Select value={reviewerId} onChange={(event) => setReviewerId(event.target.value)} className="w-64">
        <option value="" disabled>
          Select…
        </option>
        {employees.map((employee) => (
          <option key={employee.employeeNumber} value={employee.employeeNumber}>
            {employee.firstName} {employee.lastName}
          </option>
        ))}
      </Select>
      <Button type="button" onClick={handleReassign} disabled={pending} size="sm">
        {pending ? "Reassigning…" : "Reassign"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
