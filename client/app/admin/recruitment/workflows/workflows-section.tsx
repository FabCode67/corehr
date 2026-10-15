"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { COMMON_WORKFLOWS } from "@/lib/recruitment-presets"
import {
  createWorkflow,
  deactivateWorkflow,
  setWorkflowStages,
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

function NewWorkflowForm({ actingEmployeeId, bands, stages }: { actingEmployeeId: string; bands: Band[]; stages: RecruitmentStageDefinition[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [templateId, setTemplateId] = useState("")
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [minRank, setMinRank] = useState("")
  const [maxRank, setMaxRank] = useState("")
  const [contractTypes, setContractTypes] = useState<string[]>([])
  const [isDefault, setIsDefault] = useState(false)
  const [selectedStageIds, setSelectedStageIds] = useState<string[]>([])
  const [note, setNote] = useState<string | null>(null)

  const activeStages = stages.filter((s) => s.isActive)
  const sortedBands = [...bands].sort((a, b) => a.rank - b.rank)

  function applyTemplate(id: string) {
    setTemplateId(id)
    setNote(null)
    const t = COMMON_WORKFLOWS.find((w) => w.id === id)
    if (!t) return
    setName(t.name)
    setDescription(t.description)
    setMinRank(t.minBandRank ? String(t.minBandRank) : "")
    setMaxRank(t.maxBandRank ? String(t.maxBandRank) : "")
    setContractTypes(t.contractTypes)
    setIsDefault(Boolean(t.isDefault))
    const byKey = new Map(activeStages.map((s) => [s.key, s.id]))
    const ids = t.stageKeys.map((k) => byKey.get(k)).filter((x): x is string => Boolean(x))
    setSelectedStageIds(ids)
    if (ids.length < t.stageKeys.length) setNote(`${t.stageKeys.length - ids.length} stage(s) of this template aren't in your catalog yet — add them from “Common stages” on the left.`)
  }

  const toggleStage = (id: string) => setSelectedStageIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  const toggleContract = (v: string) => setContractTypes((prev) => (prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]))

  function submit(event: React.FormEvent) {
    event.preventDefault()
    setError(null)
    const fd = new FormData()
    fd.set("actingEmployeeId", actingEmployeeId)
    fd.set("name", name)
    if (description) fd.set("description", description)
    if (minRank) fd.set("minBandRank", minRank)
    if (maxRank) fd.set("maxBandRank", maxRank)
    for (const c of contractTypes) fd.append("contractTypes", c)
    if (isDefault) fd.set("isDefault", "on")
    startTransition(async () => {
      const created = await createWorkflow(undefined, fd)
      if (created.error) return setError(created.error)
      if (created.id && selectedStageIds.length > 0) {
        const staged = await setWorkflowStages(created.id, actingEmployeeId, selectedStageIds)
        if (staged.error) return setError(staged.error)
      }
      setName("")
      setDescription("")
      setSelectedStageIds([])
      setTemplateId("")
      router.refresh()
    })
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Create a workflow</p>

      <div className="flex flex-col gap-1">
        <Label className="text-xs">Start from a common workflow</Label>
        <Select value={templateId} onChange={(e) => applyTemplate(e.target.value)} className="h-8 text-xs">
          <option value="">Choose a template (optional)…</option>
          {COMMON_WORKFLOWS.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name} — {w.description}
            </option>
          ))}
        </Select>
        {note ? <p className="text-xs text-amber-600">{note}</p> : null}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <div className="flex flex-col gap-1 sm:col-span-2">
          <Label htmlFor="wf-name" className="text-xs">
            Name
          </Label>
          <Input id="wf-name" value={name} onChange={(e) => setName(e.target.value)} required className="h-8 text-xs" />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">Applies from band</Label>
          <Select value={minRank} onChange={(e) => setMinRank(e.target.value)} className="h-8 text-xs">
            <option value="">Any</option>
            {sortedBands.map((b) => (
              <option key={b.id} value={b.rank}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs">…up to band</Label>
          <Select value={maxRank} onChange={(e) => setMaxRank(e.target.value)} className="h-8 text-xs">
            <option value="">Any</option>
            {sortedBands.map((b) => (
              <option key={b.id} value={b.rank}>
                {b.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <span className="text-xs text-muted-foreground">Contract types (leave blank to match any)</span>
        <div className="flex flex-wrap gap-3">
          {CONTRACT_TYPES.map((type) => (
            <label key={type.value} className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input type="checkbox" checked={contractTypes.includes(type.value)} onChange={() => toggleContract(type.value)} />
              {type.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs text-muted-foreground">Stages, in order — click to add or remove</span>
        {activeStages.length === 0 ? (
          <p className="text-xs text-muted-foreground">Add stages to the catalog first (see “Common stages”).</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {activeStages.map((s) => {
              const index = selectedStageIds.indexOf(s.id)
              const on = index >= 0
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleStage(s.id)}
                  className={`rounded-full border px-2.5 py-1 text-xs ${on ? "border-primary bg-primary/10 text-foreground" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  {on ? `${index + 1}. ` : "+ "}
                  {s.name}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <input type="checkbox" checked={isDefault} onChange={(e) => setIsDefault(e.target.checked)} />
        Use as the default workflow (fallback when nothing else matches)
      </label>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div>
        <Button type="submit" size="sm" disabled={pending || !name.trim()}>
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
      <NewWorkflowForm actingEmployeeId={actingEmployeeId} bands={bands} stages={stages} />
    </div>
  )
}
