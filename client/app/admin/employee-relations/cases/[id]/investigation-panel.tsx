"use client"

import { useActionState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { completeInvestigation, openInvestigation, type ErActionState } from "@/lib/api/employee-relations-actions"
import type { Investigation } from "@/lib/api/employee-relations"

interface EmployeeOption {
  employeeNumber: string
  firstName: string
  lastName: string
}

export function OpenInvestigationForm({ caseId, actingEmployeeId, employees }: { caseId: string; actingEmployeeId: string; employees: EmployeeOption[] }) {
  const [state, formAction, pending] = useActionState<ErActionState | undefined, FormData>(openInvestigation.bind(null, caseId), undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <input type="hidden" name="actingEmployeeId" value={actingEmployeeId} />
      <p className="text-sm font-medium text-foreground">Open an investigation</p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="investigatorId">Investigator</Label>
          <Select id="investigatorId" name="investigatorId" required defaultValue="">
            <option value="" disabled>
              Select an investigator…
            </option>
            {employees.map((employee) => (
              <option key={employee.employeeNumber} value={employee.employeeNumber}>
                {employee.firstName} {employee.lastName}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="startDate">Start date</Label>
          <Input id="startDate" name="startDate" type="date" required />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="dueDate">Expected completion date (optional)</Label>
        <Input id="dueDate" name="dueDate" type="date" />
      </div>
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Opening…" : "Open investigation"}
        </Button>
      </div>
    </form>
  )
}

export function CompleteInvestigationForm({ caseId, investigation, actingEmployeeId }: { caseId: string; investigation: Investigation; actingEmployeeId: string }) {
  const [state, formAction, pending] = useActionState<ErActionState | undefined, FormData>(
    completeInvestigation.bind(null, caseId, investigation.id),
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
      <input type="hidden" name="actingEmployeeId" value={actingEmployeeId} />
      <p className="text-sm font-medium text-foreground">Complete this investigation</p>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`summary-${investigation.id}`}>Summary (optional)</Label>
        <Textarea id={`summary-${investigation.id}`} name="summary" rows={2} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`findings-${investigation.id}`}>Findings</Label>
        <Textarea id={`findings-${investigation.id}`} name="findings" rows={3} required />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor={`recommendation-${investigation.id}`}>Recommendation</Label>
        <Textarea id={`recommendation-${investigation.id}`} name="recommendation" rows={2} required />
      </div>
      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Completing…" : "Complete investigation"}
        </Button>
      </div>
    </form>
  )
}

export function InvestigationCard({ investigation }: { investigation: Investigation }) {
  return (
    <div className="rounded-lg border border-border p-3 text-sm">
      <div className="flex items-center justify-between">
        <p className="font-medium text-foreground">
          Investigator: {investigation.investigator.firstName} {investigation.investigator.lastName}
        </p>
        <Badge variant={investigation.status === "COMPLETED" ? "success" : "default"}>{investigation.status.replaceAll("_", " ")}</Badge>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {new Date(investigation.startDate).toLocaleDateString()} – {investigation.endDate ? new Date(investigation.endDate).toLocaleDateString() : "ongoing"}
        {investigation.dueDate ? ` · due ${new Date(investigation.dueDate).toLocaleDateString()}` : ""}
      </p>
      {investigation.summary ? <p className="mt-2 text-sm text-foreground">{investigation.summary}</p> : null}
      {investigation.findings ? (
        <p className="mt-1 text-sm text-foreground">
          <span className="text-muted-foreground">Findings: </span>
          {investigation.findings}
        </p>
      ) : null}
      {investigation.recommendation ? (
        <p className="mt-1 text-sm text-foreground">
          <span className="text-muted-foreground">Recommendation: </span>
          {investigation.recommendation}
        </p>
      ) : null}
    </div>
  )
}
