"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { chooseFormSignatory, saveFormDraftResponses, submitFormInstance } from "@/lib/api/forms-actions"
import type { FormField, FormInstance } from "@/lib/api/forms"

interface EmployeeOption {
  employeeNumber: string
  firstName: string
  lastName: string
}

const APPROVAL_DECISION_OPTIONS = ["APPROVE", "REJECT", "RECOMMEND"]

function FieldInput({ field, value, onChange }: { field: FormField; value: unknown; onChange: (value: unknown) => void }) {
  switch (field.fieldType) {
    case "LONG_TEXT":
    case "COMMENTS":
    case "RECOMMENDATION":
      return <Textarea value={(value as string) ?? ""} onChange={(event) => onChange(event.target.value)} />

    case "NUMBER":
    case "AMOUNT":
    case "PERCENTAGE":
      return <Input type="number" value={(value as number | string) ?? ""} onChange={(event) => onChange(event.target.value === "" ? "" : Number(event.target.value))} />

    case "DATE":
      return <Input type="date" value={(value as string) ?? ""} onChange={(event) => onChange(event.target.value)} />

    case "DATE_RANGE": {
      const range = (value as { start?: string; end?: string }) ?? {}
      return (
        <div className="flex items-center gap-2">
          <Input type="date" value={range.start ?? ""} onChange={(event) => onChange({ ...range, start: event.target.value })} />
          <span className="text-muted-foreground">to</span>
          <Input type="date" value={range.end ?? ""} onChange={(event) => onChange({ ...range, end: event.target.value })} />
        </div>
      )
    }

    case "DROPDOWN":
    case "RADIO":
    case "APPROVAL_DECISION": {
      const options = field.options?.map((option) => option.value) ?? (field.fieldType === "APPROVAL_DECISION" ? APPROVAL_DECISION_OPTIONS : [])
      const labels = new Map((field.options ?? []).map((option) => [option.value, option.label]))
      return (
        <Select value={(value as string) ?? ""} onChange={(event) => onChange(event.target.value)}>
          <option value="" disabled>
            Select…
          </option>
          {options.map((option) => (
            <option key={option} value={option}>
              {labels.get(option) ?? option}
            </option>
          ))}
        </Select>
      )
    }

    case "CHECKBOX":
      if (!field.options || field.options.length === 0) {
        return (
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" className="size-4" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} />
            {field.label}
          </label>
        )
      }
      return <CheckboxGroup field={field} value={(value as string[]) ?? []} onChange={onChange} />

    case "MULTI_SELECT":
      return <CheckboxGroup field={field} value={(value as string[]) ?? []} onChange={onChange} />

    case "TABLE":
      return <TableInput field={field} value={(value as Record<string, unknown>[]) ?? []} onChange={onChange} />

    case "EMPLOYEE_SELECT":
      return <Input placeholder="Employee number" value={(value as string) ?? ""} onChange={(event) => onChange(event.target.value)} />
    case "DEPARTMENT_SELECT":
      return <Input placeholder="Department" value={(value as string) ?? ""} onChange={(event) => onChange(event.target.value)} />
    case "POSITION_SELECT":
      return <Input placeholder="Position" value={(value as string) ?? ""} onChange={(event) => onChange(event.target.value)} />
    case "MANAGER_SELECT":
      return <Input placeholder="Manager's employee number" value={(value as string) ?? ""} onChange={(event) => onChange(event.target.value)} />

    case "FILE_UPLOAD":
    case "CERTIFICATE_UPLOAD":
    case "ATTACHMENT_UPLOAD":
      return <Input placeholder="Document URL" value={(value as string) ?? ""} onChange={(event) => onChange(event.target.value)} />

    case "SHORT_TEXT":
    default:
      return <Input value={(value as string) ?? ""} onChange={(event) => onChange(event.target.value)} />
  }
}

function CheckboxGroup({ field, value, onChange }: { field: FormField; value: string[]; onChange: (value: string[]) => void }) {
  const options = field.options ?? []
  return (
    <div className="flex flex-col gap-1.5">
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            className="size-4"
            checked={value.includes(option.value)}
            onChange={(event) => onChange(event.target.checked ? [...value, option.value] : value.filter((item) => item !== option.value))}
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}

function TableInput({ field, value, onChange }: { field: FormField; value: Record<string, unknown>[]; onChange: (value: Record<string, unknown>[]) => void }) {
  const columns = field.tableColumns ?? []

  function updateRow(index: number, key: string, cellValue: string) {
    const next = value.map((row, rowIndex) => (rowIndex === index ? { ...row, [key]: cellValue } : row))
    onChange(next)
  }

  function addRow() {
    onChange([...value, Object.fromEntries(columns.map((column) => [column.key, ""]))])
  }

  function removeRow(index: number) {
    onChange(value.filter((_, rowIndex) => rowIndex !== index))
  }

  return (
    <div className="flex flex-col gap-2">
      {value.map((row, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2 rounded-lg border border-border p-2">
          {columns.map((column) => (
            <Input
              key={column.key}
              placeholder={column.label}
              value={(row[column.key] as string) ?? ""}
              onChange={(event) => updateRow(index, column.key, event.target.value)}
              className="w-40"
            />
          ))}
          <Button type="button" size="xs" variant="outline" onClick={() => removeRow(index)}>
            Remove row
          </Button>
        </div>
      ))}
      <Button type="button" size="sm" variant="outline" onClick={addRow}>
        Add row
      </Button>
    </div>
  )
}

export function FillForm({ instance, employees, actingEmployeeId }: { instance: FormInstance; employees: EmployeeOption[]; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [values, setValues] = useState<Record<string, unknown>>(() =>
    Object.fromEntries(instance.responses.map((response) => [response.formFieldId, response.value]))
  )
  const [signatoryChoices, setSignatoryChoices] = useState<Record<string, string>>({})

  const sortedFields = [...instance.formTemplate.fields].sort((a, b) => a.order - b.order)
  const unresolvedSignatures = instance.signatures.filter((signature) => !signature.signerId)

  function buildResponses() {
    return sortedFields.map((field) => ({ formFieldId: field.id, value: values[field.id] ?? null }))
  }

  function saveDraft() {
    setError(null)
    startTransition(async () => {
      const result = await saveFormDraftResponses(instance.id, actingEmployeeId, buildResponses())
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  function submit() {
    setError(null)
    startTransition(async () => {
      for (const signature of unresolvedSignatures) {
        const signerId = signatoryChoices[signature.id]
        if (signerId) {
          const result = await chooseFormSignatory(instance.id, signature.id, actingEmployeeId, signerId)
          if (result?.error) {
            setError(result.error)
            return
          }
        }
      }

      const saveResult = await saveFormDraftResponses(instance.id, actingEmployeeId, buildResponses())
      if (saveResult?.error) {
        setError(saveResult.error)
        return
      }

      const submitResult = await submitFormInstance(instance.id, actingEmployeeId)
      if (submitResult?.error) {
        setError(submitResult.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-5">
      {sortedFields.map((field) => (
        <div key={field.id} className="flex flex-col gap-1.5">
          <Label>
            {field.label}
            {field.isRequired ? <span className="text-destructive"> *</span> : null}
          </Label>
          {field.helpText ? <p className="text-xs text-muted-foreground">{field.helpText}</p> : null}
          <FieldInput field={field} value={values[field.id]} onChange={(value) => setValues((prev) => ({ ...prev, [field.id]: value }))} />
        </div>
      ))}

      {unresolvedSignatures.length > 0 ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
          <p className="text-sm font-medium text-foreground">Select signatories</p>
          <p className="text-xs text-muted-foreground">These signature stages need a specific person selected before you can submit.</p>
          {unresolvedSignatures.map((signature) => (
            <div key={signature.id} className="flex flex-col gap-1.5">
              <Label>{signature.formSignatureStage.label ?? signature.formSignatureStage.role}</Label>
              <Select
                value={signatoryChoices[signature.id] ?? ""}
                onChange={(event) => setSignatoryChoices((prev) => ({ ...prev, [signature.id]: event.target.value }))}
              >
                <option value="" disabled>
                  Select a person…
                </option>
                {employees.map((employee) => (
                  <option key={employee.employeeNumber} value={employee.employeeNumber}>
                    {employee.firstName} {employee.lastName} ({employee.employeeNumber})
                  </option>
                ))}
              </Select>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" disabled={pending} onClick={saveDraft}>
          {pending ? "Saving…" : "Save draft"}
        </Button>
        <Button type="button" disabled={pending} onClick={submit}>
          {pending ? "Submitting…" : "Submit"}
        </Button>
      </div>
    </div>
  )
}
