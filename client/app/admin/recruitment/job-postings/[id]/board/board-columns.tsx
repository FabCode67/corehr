"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { advanceApplications } from "@/lib/api/recruitment-actions"

import { BoardCard } from "./board-card"

export interface BoardColumnData {
  stepId: string
  name: string
  index: number
  isLast: boolean
  /** Moving on from here ends at / lands on the onboarding step → hire. */
  hireAfter: boolean
  apps: { id: string; name: string; score: number | null; onHold: boolean }[]
}

/** Step columns with tick-boxes: select several candidates and move them on in one click. */
export function BoardColumns({ columns, actingEmployeeId }: { columns: BoardColumnData[]; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  function moveSelected() {
    setError(null)
    const ids = [...selected]
    startTransition(async () => {
      const result = await advanceApplications(ids, actingEmployeeId)
      if (result?.error) return setError(result.error)
      setSelected(new Set())
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.size > 0 ? (
        <div className="sticky top-2 z-10 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/40 bg-background px-4 py-2 shadow-sm">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={pending} onClick={moveSelected}>
              {pending ? "Moving…" : `Move ${selected.size} to next step`}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
          </div>
          {error ? <p className="w-full text-xs text-destructive">{error}</p> : null}
        </div>
      ) : null}

      <div className="flex gap-4 overflow-x-auto pb-2">
        {columns.map((col) => (
          <Card key={col.stepId} className="w-64 shrink-0 bg-muted/30">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">
                {col.index + 1}. {col.name}
              </CardTitle>
              <CardDescription className="flex items-center justify-between">
                <span>{col.apps.length} candidate(s)</span>
                {col.apps.length > 1 ? (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() =>
                      setSelected((prev) => {
                        const next = new Set(prev)
                        const all = col.apps.every((a) => next.has(a.id))
                        col.apps.forEach((a) => (all ? next.delete(a.id) : next.add(a.id)))
                        return next
                      })
                    }
                  >
                    Select all
                  </button>
                ) : null}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {col.apps.map((a) => (
                <div key={a.id} className="flex items-start gap-2">
                  <input type="checkbox" className="mt-3" checked={selected.has(a.id)} onChange={() => toggle(a.id)} aria-label={`Select ${a.name}`} />
                  <div className="flex-1">
                    <BoardCard
                      applicationId={a.id}
                      actingEmployeeId={actingEmployeeId}
                      name={a.name}
                      score={a.score}
                      stepName={col.name}
                      isLastStep={col.isLast}
                      hireAfter={col.hireAfter}
                      onHold={a.onHold}
                    />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
      <p className="hidden">
        <Link href="#">.</Link>
      </p>
    </div>
  )
}
