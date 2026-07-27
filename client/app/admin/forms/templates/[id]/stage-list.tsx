"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { addSignatureStage, removeSignatureStage, updateSignatureStage } from "@/lib/api/forms-actions"
import { SIGNER_ROLE_LABELS, type FormSignatureStage, type SignerRole } from "@/lib/api/forms"

interface EmployeeOption {
  employeeNumber: string
  firstName: string
  lastName: string
}

function StageEditor({
  templateId,
  stage,
  stageOrder,
  employees,
  onDone,
}: {
  templateId: string
  stage?: FormSignatureStage
  stageOrder: number
  employees: EmployeeOption[]
  onDone: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [order, setOrder] = useState(stage?.stageOrder ?? stageOrder)
  const [role, setRole] = useState<SignerRole>(stage?.role ?? "MANAGER")
  const [specificApproverId, setSpecificApproverId] = useState(stage?.specificApproverId ?? "")
  const [label, setLabel] = useState(stage?.label ?? "")

  function save() {
    if (role === "SPECIFIC_APPROVER" && !specificApproverId) {
      setError("Select the specific approver.")
      return
    }
    setError(null)
    startTransition(async () => {
      const payload = {
        stageOrder: order,
        role,
        specificApproverId: role === "SPECIFIC_APPROVER" ? specificApproverId : undefined,
        label: label.trim() || undefined,
      }
      const result = stage ? await updateSignatureStage(templateId, stage.id, payload) : await addSignatureStage(templateId, payload)
      if (result?.error) {
        setError(result.error)
        return
      }
      onDone()
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label>Stage order</Label>
          <Input type="number" min={1} value={order} onChange={(event) => setOrder(Number(event.target.value))} />
          <p className="text-xs text-muted-foreground">Stages sharing an order sign in parallel.</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Signer role</Label>
          <Select value={role} onChange={(event) => setRole(event.target.value as SignerRole)}>
            {Object.entries(SIGNER_ROLE_LABELS).map(([value, roleLabel]) => (
              <option key={value} value={value}>
                {roleLabel}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Stage label (optional)</Label>
          <Input value={label} onChange={(event) => setLabel(event.target.value)} placeholder="e.g. Manager Sign-off" />
        </div>
      </div>

      {role === "SPECIFIC_APPROVER" ? (
        <div className="flex flex-col gap-1.5">
          <Label>Specific approver</Label>
          <Select value={specificApproverId} onChange={(event) => setSpecificApproverId(event.target.value)}>
            <option value="" disabled>
              Select an employee…
            </option>
            {employees.map((employee) => (
              <option key={employee.employeeNumber} value={employee.employeeNumber}>
                {employee.firstName} {employee.lastName} ({employee.employeeNumber})
              </option>
            ))}
          </Select>
        </div>
      ) : null}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? "Saving…" : stage ? "Save stage" : "Add stage"}
        </Button>
      </div>
    </div>
  )
}

export function StageList({
  templateId,
  stages,
  employees,
  editable,
}: {
  templateId: string
  stages: FormSignatureStage[]
  employees: EmployeeOption[]
  editable: boolean
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  function remove(stageId: string) {
    startTransition(async () => {
      await removeSignatureStage(templateId, stageId)
      router.refresh()
    })
  }

  const sorted = [...stages].sort((a, b) => a.stageOrder - b.stageOrder)

  return (
    <div className="flex flex-col gap-3">
      {sorted.length === 0 ? <p className="text-sm text-muted-foreground">No signature stages yet — this form completes without any signatures.</p> : null}

      {sorted.map((stage) =>
        editingId === stage.id ? (
          <StageEditor key={stage.id} templateId={templateId} stage={stage} stageOrder={stage.stageOrder} employees={employees} onDone={() => setEditingId(null)} />
        ) : (
          <div key={stage.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            <div>
              <p className="font-medium text-foreground">
                Stage {stage.stageOrder} — {stage.label ?? SIGNER_ROLE_LABELS[stage.role]}
              </p>
              <p className="text-xs text-muted-foreground">
                {SIGNER_ROLE_LABELS[stage.role]}
                {stage.specificApprover ? ` — ${stage.specificApprover.firstName} ${stage.specificApprover.lastName}` : ""}
              </p>
            </div>
            {editable ? (
              <div className="flex gap-3">
                <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setEditingId(stage.id)}>
                  Edit
                </button>
                <button type="button" disabled={pending} className="text-xs font-medium text-destructive hover:underline" onClick={() => remove(stage.id)}>
                  Remove
                </button>
              </div>
            ) : null}
          </div>
        )
      )}

      {editable ? (
        adding ? (
          <StageEditor templateId={templateId} stageOrder={sorted.length > 0 ? Math.max(...sorted.map((s) => s.stageOrder)) + 1 : 1} employees={employees} onDone={() => setAdding(false)} />
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
            Add signature stage
          </Button>
        )
      ) : null}
    </div>
  )
}
