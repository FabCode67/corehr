"use client"

import { useActionState, useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  createWorkflow,
  deactivateWorkflow,
  setWorkflowStages,
  type RecruitmentActionState,
} from "@/lib/api/recruitment-actions"
import type { RecruitmentStageDefinition, RecruitmentWorkflow } from "@/lib/api/recruitment"
import type { Band } from "@/lib/api/bands"
import type { ContractType } from "@/lib/api/employees"

const CONTRACT_TYPES: { value: ContractType; label: string }[] = [
  { value: "PERMANENT", label: "Permanent" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "GRADUATE_TRAINEE", label: "Graduate Trainee" },
  { value: "INTERN", label: "Intern" },
]

function StagePicker({
  workflowId,
  allStages,
  selectedIds,
  actingEmployeeId,
}: {
  workflowId: string
  allStages: RecruitmentStageDefinition[]
  selectedIds: string[]
  actingEmployeeId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [ids, setIds] = useState<string[]>(selectedIds)

  const selected = useMemo(() => ids.map((id) => allStages.find((stage) => stage.id === id)).filter((stage): stage is RecruitmentStageDefinition => Boolean(stage)), [ids, allStages])
  const available = allStages.filter((stage) => stage.isActive && !ids.includes(stage.id))

  function save(nextIds: string[]) {
    setIds(nextIds)
    setError(null)
    startTransition(async () => {
      const result = await setWorkflowStages(workflowId, actingEmployeeId, nextIds)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction
    if (target < 0 || target >= ids.length) return
    const next = [...ids]
    ;[next[index], next[target]] = [next[target], next[index]]
    save(next)
  }

  function remove(id: string) {
    save(ids.filter((existing) => existing !== id))
  }

  function add(id: string) {
    save([...ids, id])
  }

  return (
    <div className="flex flex-col gap-2">
      {selected.length === 0 ? (
        <p className="text-xs text-muted-foreground">No stages assigned yet — add one below.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {selected.map((stage, index) => (
            <li key={stage.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1 text-xs">
              <span className="flex items-center gap-1.5">
                <span className="text-muted-foreground">{index + 1}.</span>
                {stage.name}
              </span>
              <span className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={pending || index === 0}
                  onClick={() => move(index, -1)}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  title="Move up"
                >
                  <ArrowUp className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={pending || index === selected.length - 1}
                  onClick={() => move(index, 1)}
                  className="rounded p-0.5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                  title="Move down"
                >
                  <ArrowDown className="size-3.5" />
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => remove(stage.id)}
                  className="ml-1 text-muted-foreground hover:text-destructive"
                  title="Remove"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ol>
      )}

      {available.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {available.map((stage) => (
            <button
              key={stage.id}
              type="button"
              disabled={pending}
              onClick={() => add(stage.id)}
              className="rounded-full border border-dashed border-border px-2 py-0.5 text-xs text-muted-foreground hover:border-primary hover:text-foreground"
            >
              + {stage.name}
            </button>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function WorkflowCard({
  workflow,
  allStages,
  actingEmployeeId,
}: {
  workflow: RecruitmentWorkflow
  allStages: RecruitmentStageDefinition[]
  actingEmployeeId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const sortedStageIds = [...workflow.stages].sort((a, b) => a.sequence - b.sequence).map((entry) => entry.stage.id)

  function deactivate() {
    startTransition(async () => {
      await deactivateWorkflow(workflow.id, actingEmployeeId)
      router.refresh()
    })
  }

  const rangeLabel =
    workflow.minBandRank || workflow.maxBandRank
      ? `Band rank ${workflow.minBandRank ?? "1"}–${workflow.maxBandRank ?? "∞"}`
      : "All bands"

  return (
    <li className="rounded-lg border border-border p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-foreground">{workflow.name}</span>
            {workflow.isDefault ? <Badge variant="secondary">Default</Badge> : null}
            {!workflow.isActive ? <Badge variant="destructive">Inactive</Badge> : null}
          </div>
          {workflow.description ? <p className="mt-0.5 text-xs text-muted-foreground">{workflow.description}</p> : null}
          <p className="mt-1 text-xs text-muted-foreground">
            {rangeLabel}
            {workflow.contractTypes.length > 0 ? ` · ${workflow.contractTypes.map((type) => type.replaceAll("_", " ")).join(", ")}` : ""}
          </p>
        </div>
        {workflow.isActive && !workflow.isDefault ? (
          <Button type="button" size="sm" variant="ghost" disabled={pending} onClick={deactivate}>
            Deactivate
          </Button>
        ) : null}
      </div>

      <div className="mt-3 border-t border-border pt-3">
        <StagePicker workflowId={workflow.id} allStages={allStages} selectedIds={sortedStageIds} actingEmployeeId={actingEmployeeId} />
      </div>
    </li>
  )
}

function NewWorkflowForm({ actingEmployeeId, bands }: { actingEmployeeId: string; bands: Band[] }) {
  const [state, formAction, pending] = useActionState<RecruitmentActionState | undefined, FormData>(createWorkflow, undefined)
  const rankBounds = bands.length > 0 ? { min: Math.min(...bands.map((band) => band.rank)), max: Math.max(...bands.map((band) => band.rank)) } : null

  return (
    <form action={formAction} className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Create a workflow</p>
      <input type="hidden" name="actingEmployeeId" value={actingEmployeeId} />

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label htmlFor="wf-name" className="text-xs">
            Name
          </Label>
          <Input id="wf-name" name="name" required className="h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="minBandRank" className="text-xs">
            Min band rank {rankBounds ? `(${rankBounds.min}–${rankBounds.max})` : ""}
          </Label>
          <Input id="minBandRank" name="minBandRank" type="number" min={1} className="h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="maxBandRank" className="text-xs">
            Max band rank
          </Label>
          <Input id="maxBandRank" name="maxBandRank" type="number" min={1} className="h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label htmlFor="wf-description" className="text-xs">
            Description (optional)
          </Label>
          <Input id="wf-description" name="description" className="h-8 text-xs" />
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Contract types (leave blank to match any)</span>
        <div className="flex flex-wrap gap-3">
          {CONTRACT_TYPES.map((type) => (
            <label key={type.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" name="contractTypes" value={type.value} />
              {type.label}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input type="checkbox" name="isDefault" />
        Use as the default workflow (fallback when nothing else matches)
      </label>

      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creating…" : "Create workflow"}
        </Button>
      </div>
    </form>
  )
}

export function WorkflowsSection({
  workflows,
  stages,
  bands,
  actingEmployeeId,
}: {
  workflows: RecruitmentWorkflow[]
  stages: RecruitmentStageDefinition[]
  bands: Band[]
  actingEmployeeId: string
}) {
  return (
    <div className="flex flex-col gap-3">
      {workflows.length === 0 ? (
        <p className="text-sm text-muted-foreground">No workflows configured yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {workflows.map((workflow) => (
            <WorkflowCard key={workflow.id} workflow={workflow} allStages={stages} actingEmployeeId={actingEmployeeId} />
          ))}
        </ul>
      )}
      <NewWorkflowForm actingEmployeeId={actingEmployeeId} bands={bands} />
    </div>
  )
}
