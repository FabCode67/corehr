"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { assignGrievance, updateGrievanceStatus } from "@/lib/api/employee-relations-actions"
import { GRIEVANCE_STATUS_LABELS, type GrievanceStatus } from "@/lib/api/employee-relations"

interface EmployeeOption {
  employeeNumber: string
  firstName: string
  lastName: string
}

export function GrievanceActions({
  grievanceId,
  actingEmployeeId,
  currentStatus,
  currentAssignedToId,
  hrEmployees,
}: {
  grievanceId: string
  actingEmployeeId: string
  currentStatus: GrievanceStatus
  currentAssignedToId: string | null
  hrEmployees: EmployeeOption[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<GrievanceStatus>(currentStatus)
  const [resolutionComments, setResolutionComments] = useState("")
  const [assignedToId, setAssignedToId] = useState(currentAssignedToId ?? "")

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Assign to</label>
        <div className="flex gap-2">
          <Select value={assignedToId} onChange={(event) => setAssignedToId(event.target.value)} className="flex-1">
            <option value="">Unassigned</option>
            {hrEmployees.map((employee) => (
              <option key={employee.employeeNumber} value={employee.employeeNumber}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </Select>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={pending || !assignedToId}
            onClick={() => run(() => assignGrievance(grievanceId, actingEmployeeId, assignedToId))}
          >
            Assign
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Status</label>
        <Select value={status} onChange={(event) => setStatus(event.target.value as GrievanceStatus)}>
          {Object.entries(GRIEVANCE_STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs text-muted-foreground">Resolution comments (optional)</label>
        <Textarea value={resolutionComments} onChange={(event) => setResolutionComments(event.target.value)} rows={3} />
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button
          type="button"
          size="sm"
          disabled={pending}
          onClick={() => run(() => updateGrievanceStatus(grievanceId, actingEmployeeId, status, resolutionComments.trim() || undefined))}
        >
          {pending ? "Saving…" : "Update status"}
        </Button>
      </div>
    </div>
  )
}
