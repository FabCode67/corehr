"use client"

import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  createStageDefinition,
  updateStageDefinition,
  upsertStageCriterion,
  type RecruitmentActionState,
} from "@/lib/api/recruitment-actions"
import { STAGE_TYPE_LABELS, type RecruitmentStageDefinition, type RecruitmentStageType } from "@/lib/api/recruitment"

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
      <NewStageForm actingEmployeeId={actingEmployeeId} />
    </div>
  )
}
