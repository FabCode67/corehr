"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { updateRequisitionStage } from "@/lib/api/recruitment-actions"
import { STAGE_LABELS, type RecruitmentStageInstance, type StageStatus } from "@/lib/api/recruitment"

const STATUS_VARIANT: Record<StageStatus, "outline" | "success" | "default"> = {
  NOT_STARTED: "outline",
  IN_PROGRESS: "default",
  COMPLETED: "success",
}

function toDateInputValue(value: string | null) {
  return value ? value.slice(0, 10) : ""
}

/** A stage is "delayed" — computed at read time, never stored, same
 *  pattern as CourseAssignment overdue logic — when it's still not
 *  COMPLETED and its planned end date has already passed. */
function isDelayed(stage: RecruitmentStageInstance) {
  if (stage.status === "COMPLETED" || !stage.plannedEnd) return false
  return new Date(stage.plannedEnd).getTime() < Date.now()
}

function StageRow({ stage, requisitionId, actingEmployeeId }: { stage: RecruitmentStageInstance; requisitionId: string; actingEmployeeId: string }) {
  const router = useRouter()
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<StageStatus>(stage.status)
  const [actualStart, setActualStart] = useState(toDateInputValue(stage.actualStart))
  const [actualEnd, setActualEnd] = useState(toDateInputValue(stage.actualEnd))

  function save() {
    setError(null)
    startTransition(async () => {
      const result = await updateRequisitionStage(requisitionId, stage.stage, actingEmployeeId, {
        status,
        actualStart: actualStart || undefined,
        actualEnd: actualEnd || undefined,
      })
      if (result?.error) {
        setError(result.error)
        return
      }
      setEditing(false)
      router.refresh()
    })
  }

  const delayed = isDelayed(stage)

  return (
    <tr className="hover:bg-muted/30">
      <td className="px-4 py-3 font-medium text-foreground">{STAGE_LABELS[stage.stage]}</td>
      <td className="px-4 py-3 text-muted-foreground">
        {stage.plannedStart ? new Date(stage.plannedStart).toLocaleDateString() : "—"} –{" "}
        {stage.plannedEnd ? new Date(stage.plannedEnd).toLocaleDateString() : "—"}
      </td>
      <td className="px-4 py-3">
        {editing ? (
          <div className="flex items-center gap-1.5">
            <Input type="date" value={actualStart} onChange={(event) => setActualStart(event.target.value)} className="h-7 w-32 text-xs" />
            <span className="text-muted-foreground">–</span>
            <Input type="date" value={actualEnd} onChange={(event) => setActualEnd(event.target.value)} className="h-7 w-32 text-xs" />
          </div>
        ) : (
          <span className="text-muted-foreground">
            {stage.actualStart ? new Date(stage.actualStart).toLocaleDateString() : "—"} –{" "}
            {stage.actualEnd ? new Date(stage.actualEnd).toLocaleDateString() : "—"}
          </span>
        )}
      </td>
      <td className="px-4 py-3">{stage.owner ? `${stage.owner.firstName} ${stage.owner.lastName}` : "—"}</td>
      <td className="px-4 py-3">
        {editing ? (
          <Select value={status} onChange={(event) => setStatus(event.target.value as StageStatus)} className="h-7 w-36 text-xs">
            <option value="NOT_STARTED">Not started</option>
            <option value="IN_PROGRESS">In progress</option>
            <option value="COMPLETED">Completed</option>
          </Select>
        ) : (
          <div className="flex items-center gap-1.5">
            <Badge variant={STATUS_VARIANT[stage.status]}>{stage.status.replaceAll("_", " ")}</Badge>
            {delayed ? <Badge variant="destructive">Delayed</Badge> : null}
          </div>
        )}
      </td>
      <td className="px-4 py-3 text-right">
        {editing ? (
          <div className="flex justify-end gap-2">
            <Button type="button" size="xs" disabled={pending} onClick={save}>
              {pending ? "Saving…" : "Save"}
            </Button>
            <Button type="button" size="xs" variant="outline" disabled={pending} onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </div>
        ) : (
          <Button type="button" size="xs" variant="outline" onClick={() => setEditing(true)}>
            Update
          </Button>
        )}
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
      </td>
    </tr>
  )
}

export function StageTimeline({ stages, requisitionId, actingEmployeeId }: { stages: RecruitmentStageInstance[]; requisitionId: string; actingEmployeeId: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
          <tr>
            <th className="px-4 py-3 font-medium">Stage</th>
            <th className="px-4 py-3 font-medium">Planned</th>
            <th className="px-4 py-3 font-medium">Actual</th>
            <th className="px-4 py-3 font-medium">Owner</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {stages.map((stage) => (
            <StageRow key={stage.id} stage={stage} requisitionId={requisitionId} actingEmployeeId={actingEmployeeId} />
          ))}
        </tbody>
      </table>
    </div>
  )
}
