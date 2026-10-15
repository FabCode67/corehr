"use client"

import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  addStagesToCatalog,
  createStageDefinition,
  updateStageDefinition,
  upsertStageCriterion,
  type RecruitmentActionState,
} from "@/lib/api/recruitment-actions"
import type { RecruitmentStageDefinition, RecruitmentStageType } from "@/lib/api/recruitment"
import { STAGE_TYPE_LABELS } from "@/lib/api/recruitment-utils"
import { COMMON_STAGES } from "@/lib/recruitment-presets"

const STAGE_TYPES = Object.keys(STAGE_TYPE_LABELS) as RecruitmentStageType[]

function CriteriaForm({ stageId, actingEmployeeId }: { stageId: string; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [maxScore, setMaxScore] = useState("10")

  function submit() {
    if (!name.trim()) return
    setError(null)
    startTransition(async () => {
      const result = await upsertStageCriterion(stageId, actingEmployeeId, { name: name.trim(), maxScore: Number(maxScore) || 10 })
      if (result?.error) {
        setError(result.error)
        return
      }
      setName("")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <Input
          placeholder="Add scoring criterion…"
          value={name}
          onChange={(event) => setName(event.target.value)}
          className="h-8 text-xs"
        />
        <Input
          type="number"
          min={1}
          value={maxScore}
          onChange={(event) => setMaxScore(event.target.value)}
          className="h-8 w-16 text-xs"
          title="Max score"
        />
        <Button type="button" size="sm" variant="outline" disabled={pending || !name.trim()} onClick={submit}>
          Add
        </Button>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function StageRow({ stage, actingEmployeeId }: { stage: RecruitmentStageDefinition; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)

  function toggleActive() {
    startTransition(async () => {
      await updateStageDefinition(stage.id, actingEmployeeId, { isActive: !stage.isActive })
      router.refresh()
    })
  }

  return (
    <li className="rounded-lg border border-border p-3 text-sm">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-foreground">{stage.name}</span>
            <Badge variant="outline">{STAGE_TYPE_LABELS[stage.stageType]}</Badge>
            {stage.isScored ? <Badge variant="secondary">Scored</Badge> : null}
            {stage.isSystem ? <Badge variant="outline">System</Badge> : null}
            {!stage.isActive ? <Badge variant="destructive">Inactive</Badge> : null}
          </div>
          {stage.description ? <p className="mt-1 text-xs text-muted-foreground">{stage.description}</p> : null}
        </div>
        <div className="flex shrink-0 gap-1">
          {stage.isScored ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setExpanded((value) => !value)}>
              {expanded ? "Hide criteria" : `Criteria (${stage.scoringCriteria.length})`}
            </Button>
          ) : null}
          {!stage.isSystem ? (
            <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={toggleActive}>
              {stage.isActive ? "Deactivate" : "Activate"}
            </Button>
          ) : null}
        </div>
      </div>

      {expanded && stage.isScored ? (
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3">
          {stage.scoringCriteria.length > 0 ? (
            <ul className="flex flex-col gap-1">
              {stage.scoringCriteria.map((criterion) => (
                <li key={criterion.id} className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{criterion.name}</span>
                  <span>max {criterion.maxScore}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-muted-foreground">No scoring criteria yet.</p>
          )}
          <CriteriaForm stageId={stage.id} actingEmployeeId={actingEmployeeId} />
        </div>
      ) : null}
    </li>
  )
}

function NewStageForm({ actingEmployeeId }: { actingEmployeeId: string }) {
  const [state, formAction, pending] = useActionState<RecruitmentActionState | undefined, FormData>(createStageDefinition, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Add a stage to the catalog</p>
      <input type="hidden" name="actingEmployeeId" value={actingEmployeeId} />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor="key" className="text-xs">
            Key (unique, e.g. PANEL_INTERVIEW)
          </Label>
          <Input id="key" name="key" required className="h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="name" className="text-xs">
            Name
          </Label>
          <Input id="name" name="name" required className="h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="stageType" className="text-xs">
            Type
          </Label>
          <Select id="stageType" name="stageType" required defaultValue="" className="h-8 text-xs">
            <option value="" disabled>
              Select…
            </option>
            {STAGE_TYPES.map((type) => (
              <option key={type} value={type}>
                {STAGE_TYPE_LABELS[type]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label htmlFor="description" className="text-xs">
            Description (optional)
          </Label>
          <Input id="description" name="description" className="h-8 text-xs" />
        </div>
      </div>

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input type="checkbox" name="isScored" />
        Candidates are scored at this stage
      </label>

      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add stage"}
        </Button>
      </div>
    </form>
  )
}

/** One-click picker of the stages most banks use — tick what you need, add them all at once. */
function CommonStagesPicker({ stages, actingEmployeeId }: { stages: RecruitmentStageDefinition[]; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const existing = new Set(stages.map((s) => s.key))
  const missing = COMMON_STAGES.filter((c) => !existing.has(c.key))
  const [selected, setSelected] = useState<Set<string>>(() => new Set(missing.map((m) => m.key)))
  const [error, setError] = useState<string | null>(null)

  if (missing.length === 0) return null

  const toggle = (key: string) =>
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })

  function add() {
    setError(null)
    startTransition(async () => {
      const result = await addStagesToCatalog(actingEmployeeId, missing.filter((m) => selected.has(m.key)))
      if (result?.error) return setError(result.error)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-foreground">Common stages</p>
        <div className="flex gap-2 text-xs">
          <button type="button" className="text-primary hover:underline" onClick={() => setSelected(new Set(missing.map((m) => m.key)))}>
            Select all
          </button>
          <button type="button" className="text-muted-foreground hover:underline" onClick={() => setSelected(new Set())}>
            Clear
          </button>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">Tick the stages you want in your catalog — no typing needed.</p>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {missing.map((m) => (
          <label key={m.key} className="flex items-start gap-2 rounded-md border border-border bg-background px-2 py-1.5 text-xs">
            <input type="checkbox" className="mt-0.5" checked={selected.has(m.key)} onChange={() => toggle(m.key)} />
            <span>
              <span className="font-medium text-foreground">{m.name}</span>
              <span className="block text-muted-foreground">{STAGE_TYPE_LABELS[m.stageType]}{m.isScored ? " · scored" : ""}</span>
            </span>
          </label>
        ))}
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" size="sm" disabled={pending || selected.size === 0} onClick={add}>
          {pending ? "Adding…" : `Add ${selected.size} stage${selected.size === 1 ? "" : "s"}`}
        </Button>
        {error ? <span className="text-xs text-destructive">{error}</span> : null}
      </div>
    </div>
  )
}

export function StageCatalogSection({ stages, actingEmployeeId }: { stages: RecruitmentStageDefinition[]; actingEmployeeId: string }) {
  return (
    <div className="flex flex-col gap-3">
      {stages.length === 0 ? (
        <p className="text-sm text-muted-foreground">No stages defined yet.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {stages.map((stage) => (
            <StageRow key={stage.id} stage={stage} actingEmployeeId={actingEmployeeId} />
          ))}
        </ul>
      )}
      <CommonStagesPicker stages={stages} actingEmployeeId={actingEmployeeId} />
      <details className="rounded-lg border border-border p-2">
        <summary className="cursor-pointer text-xs font-medium text-muted-foreground">Add a custom stage</summary>
        <div className="mt-2">
          <NewStageForm actingEmployeeId={actingEmployeeId} />
        </div>
      </details>
    </div>
  )
}
