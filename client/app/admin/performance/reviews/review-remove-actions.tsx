"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { deleteAllReviews, deleteReview } from "@/lib/api/performance-actions"
import type { ReviewFilters } from "@/lib/api/performance"

/** Per-row "Remove" — deletes a single review. Admin-only server-side; the
 *  button itself doesn't hide for non-admins since the Reviews page is
 *  already admin/manager-only and a non-admin's click just surfaces the
 *  server's ForbiddenException as the inline error below. */
export function RemoveReviewButton({ id, actingEmployeeId }: { id: string; actingEmployeeId: string }) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleClick() {
    if (!window.confirm("Remove this review? This cannot be undone.")) return
    setError(null)
    startTransition(async () => {
      const result = await deleteReview(id, actingEmployeeId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <span className="inline-flex flex-col items-end gap-0.5">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        className="text-xs font-medium text-destructive hover:underline disabled:opacity-50"
      >
        {pending ? "Removing…" : "Remove"}
      </button>
      {error ? <span className="text-[0.65rem] text-destructive">{error}</span> : null}
    </span>
  )
}

/** Page-level "Remove All" — deletes every review matching the Reviews
 *  page's currently-applied filters (or literally every review, if no
 *  filters are set). Exists to undo a bad bulk import in one action rather
 *  than clicking "Remove" per row. */
export function RemoveAllReviewsButton({
  filters,
  actingEmployeeId,
  count,
}: {
  filters: ReviewFilters
  actingEmployeeId: string
  count: number
}) {
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const hasFilters = Object.values(filters).some((value) => value !== undefined && value !== "")

  function handleClick() {
    const scope = hasFilters ? "every review matching the current filters" : "every performance review in the system"
    if (!window.confirm(`Remove ${scope} (${count} review${count === 1 ? "" : "s"})? This cannot be undone.`)) return
    setError(null)
    startTransition(async () => {
      const result = await deleteAllReviews(filters, actingEmployeeId)
      if (result?.error) setError(result.error)
    })
  }

  return (
    <div className="flex items-center gap-2">
      <Button type="button" variant="outline" size="sm" onClick={handleClick} disabled={pending || count === 0}>
        {pending ? "Removing…" : "Remove All"}
      </Button>
      {error ? <span className="text-xs text-destructive">{error}</span> : null}
    </div>
  )
}
