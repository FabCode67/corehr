"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { deleteHrAnalyticsSavedView, saveHrAnalyticsView } from "@/lib/api/hr-analytics-actions"
import type { SavedView } from "@/lib/api/hr-analytics"

/** "Save dashboard views" — save the current filter query string under a
 *  name, and re-apply a saved view with a plain link (no JS needed for
 *  loading — only saving/deleting need interactivity). */
export function SavedViewsPanel({
  views,
  currentQuery,
  actingEmployeeId,
}: {
  views: SavedView[]
  currentQuery: Record<string, string>
  actingEmployeeId: string
}) {
  const router = useRouter()
  const [name, setName] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function save() {
    if (!name.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await saveHrAnalyticsView(actingEmployeeId, name.trim(), currentQuery)
      if (result?.error) {
        setError(result.error)
        return
      }
      setName("")
      router.refresh()
    })
  }

  function remove(id: string) {
    startTransition(async () => {
      const result = await deleteHrAnalyticsSavedView(id, actingEmployeeId)
      if (result?.error) setError(result.error)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5">
        <Input placeholder="Save current view as…" value={name} onChange={(e) => setName(e.target.value)} className="h-8 w-48 text-xs" />
        <Button type="button" size="sm" variant="outline" disabled={pending || !name.trim()} onClick={save}>
          Save view
        </Button>
      </div>
      {views.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          {views.map((view) => (
            <span key={view.id} className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs">
              <Link href={`?${new URLSearchParams(view.filters).toString()}`} className="text-foreground hover:underline">
                {view.name}
              </Link>
              <button type="button" onClick={() => remove(view.id)} disabled={pending} className="text-muted-foreground hover:text-destructive" aria-label={`Delete ${view.name}`}>
                ×
              </button>
            </span>
          ))}
        </div>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
