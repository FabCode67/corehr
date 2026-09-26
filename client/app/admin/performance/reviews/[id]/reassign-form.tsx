"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { SearchableSelectAsync } from "@/components/ui/searchable-select-async"
import { searchEmployeesAction } from "@/lib/api/employees-actions"
import { reassignReviewer } from "@/lib/api/performance-actions"
import type { SearchableSelectOption } from "@/components/ui/searchable-select"

export function ReassignForm({
  reviewId,
  actingEmployeeId,
  currentReviewer,
  currentReviewerId,
}: {
  reviewId: string
  actingEmployeeId: string
  currentReviewer?: SearchableSelectOption | null
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
      <SearchableSelectAsync
        loadOptions={searchEmployeesAction}
        initialOption={currentReviewer ?? null}
        value={reviewerId}
        onValueChange={setReviewerId}
        placeholder="Select…"
        searchPlaceholder="Search employees by name or staff ID…"
        className="w-64"
        clearable={false}
      />
      <Button type="button" onClick={handleReassign} disabled={pending} size="sm">
        {pending ? "Reassigning…" : "Reassign"}
      </Button>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  )
}
