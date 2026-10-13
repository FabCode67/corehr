"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import type { PostingSteps, RecruitmentStageDefinition } from "@/lib/api/recruitment"
import { resetPostingSteps, setPostingSteps } from "@/lib/api/recruitment-actions"

/** HR picks and orders this job's hiring steps (interviews, tests, ...) from the stage catalog. */
export function StepsEditor({
  postingId,
  actingEmployeeId,
  initial,
  catalog,
}: {
  postingId: string
  actingEmployeeId: string
  initial: PostingSteps
  catalog: RecruitmentStageDefinition[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [steps, setSteps] = useState(initial.steps.map((s) => ({ id: s.id, name: s.name })))
  const [toAdd, setToAdd] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const available = catalog.filter((c) => !steps.some((s) => s.id === c.id))
  const move = (i: number, d: number) =>
    setSteps((prev) => {
      const next = [...prev]
      ;[next[i], next[i + d]] = [next[i + d], next[i]]
      return next
    })

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    setSaved(false)
    startTransition(async () => {
      const result = await action()
      if (result?.error) return setError(result.error)
      setSaved(true)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {initial.custom ? "Custom steps for this job." : `Using the default workflow${initial.workflowName ? ` “${initial.workflowName}”` : ""}. Edit and save to customise.`} Applicants already in the pipeline
        keep the steps they started with.
      </p>
      <ol className="flex flex-col gap-1.5">
        {steps.map((step, i) => (
          <li key={step.id} className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm">
            <span className="w-5 text-muted-foreground">{i + 1}.</span>
            <span className="flex-1">{step.name}</span>
            <Button type="button" size="sm" variant="ghost" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">
              <ArrowUp className="size-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" disabled={i === steps.length - 1} onClick={() => move(i, 1)} aria-label="Move down">
              <ArrowDown className="size-4" />
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setSteps(steps.filter((_, j) => j !== i))} aria-label="Remove">
              <Trash2 className="size-4" />
            </Button>
          </li>
        ))}
      </ol>
      <div className="flex gap-2">
        <Select value={toAdd} onChange={(e) => setToAdd(e.target.value)} className="flex-1">
          <option value="">Add a step…</option>
          {available.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!toAdd}
          onClick={() => {
            const c = catalog.find((x) => x.id === toAdd)
            if (c) setSteps([...steps, { id: c.id, name: c.name }])
            setToAdd("")
          }}
        >
          <Plus className="mr-1 size-4" />
          Add
        </Button>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" disabled={pending || steps.length === 0} onClick={() => run(() => setPostingSteps(postingId, actingEmployeeId, steps.map((s) => s.id)))}>
          {pending ? "Saving…" : "Save steps"}
        </Button>
        {initial.custom ? (
          <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => resetPostingSteps(postingId, actingEmployeeId))}>
            Reset to default
          </Button>
        ) : null}
        {saved ? <span className="text-xs text-muted-foreground">Saved.</span> : null}
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </div>
  )
}
