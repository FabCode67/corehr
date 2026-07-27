"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { addFormField, removeFormField, updateFormField } from "@/lib/api/forms-actions"
import { FIELD_TYPE_LABELS, type FieldType, type FormField } from "@/lib/api/forms"

const OPTION_FIELD_TYPES: FieldType[] = ["DROPDOWN", "RADIO", "CHECKBOX", "MULTI_SELECT"]
const TABLE_FIELD_TYPES: FieldType[] = ["TABLE"]

/** "value:label" pairs, comma-separated — the simplest input a plain text
 *  field can offer for an options list without a rich builder UI (see the
 *  "configurable field list, no drag-and-drop" scope decision). */
function parseOptions(input: string) {
  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [value, label] = part.split(":").map((piece) => piece.trim())
      return { value: value || part, label: label || value || part }
    })
}

function optionsToInput(options: FormField["options"]) {
  return (options ?? []).map((option) => (option.value === option.label ? option.value : `${option.value}:${option.label}`)).join(", ")
}

function parseTableColumns(input: string) {
  return input
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((part) => {
      const [key, label, type] = part.split(":").map((piece) => piece.trim())
      return { key: key || part, label: label || key || part, type: type || "SHORT_TEXT" }
    })
}

function tableColumnsToInput(columns: FormField["tableColumns"]) {
  return (columns ?? []).map((column) => `${column.key}:${column.label}:${column.type}`).join(", ")
}

function FieldEditor({
  templateId,
  field,
  order,
  onDone,
}: {
  templateId: string
  field?: FormField
  order: number
  onDone: () => void
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [fieldType, setFieldType] = useState<FieldType>(field?.fieldType ?? "SHORT_TEXT")
  const [label, setLabel] = useState(field?.label ?? "")
  const [helpText, setHelpText] = useState(field?.helpText ?? "")
  const [isRequired, setIsRequired] = useState(field?.isRequired ?? false)
  const [optionsInput, setOptionsInput] = useState(optionsToInput(field?.options ?? null))
  const [tableColumnsInput, setTableColumnsInput] = useState(tableColumnsToInput(field?.tableColumns ?? null))

  function save() {
    if (!label.trim()) {
      setError("Label is required.")
      return
    }
    setError(null)
    startTransition(async () => {
      const payload = {
        fieldType,
        label: label.trim(),
        helpText: helpText.trim() || undefined,
        isRequired,
        order,
        options: OPTION_FIELD_TYPES.includes(fieldType) ? parseOptions(optionsInput) : undefined,
        tableColumns: TABLE_FIELD_TYPES.includes(fieldType) ? parseTableColumns(tableColumnsInput) : undefined,
      }
      const result = field ? await updateFormField(templateId, field.id, payload) : await addFormField(templateId, payload)
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
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label>Field type</Label>
          <Select value={fieldType} onChange={(event) => setFieldType(event.target.value as FieldType)}>
            {Object.entries(FIELD_TYPE_LABELS).map(([value, fieldLabel]) => (
              <option key={value} value={value}>
                {fieldLabel}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Label</Label>
          <Input value={label} onChange={(event) => setLabel(event.target.value)} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Help text (optional)</Label>
        <Input value={helpText} onChange={(event) => setHelpText(event.target.value)} />
      </div>

      {OPTION_FIELD_TYPES.includes(fieldType) ? (
        <div className="flex flex-col gap-1.5">
          <Label>Options — comma-separated, "value:label" or just "value"</Label>
          <Input value={optionsInput} onChange={(event) => setOptionsInput(event.target.value)} placeholder="yes:Yes, no:No" />
        </div>
      ) : null}

      {TABLE_FIELD_TYPES.includes(fieldType) ? (
        <div className="flex flex-col gap-1.5">
          <Label>Columns — comma-separated "key:label:type"</Label>
          <Input
            value={tableColumnsInput}
            onChange={(event) => setTableColumnsInput(event.target.value)}
            placeholder="qualification:Qualification:SHORT_TEXT, year:Year:NUMBER"
          />
        </div>
      ) : null}

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input type="checkbox" checked={isRequired} onChange={(event) => setIsRequired(event.target.checked)} className="size-4" />
        Required
      </label>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}

      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="outline" disabled={pending} onClick={onDone}>
          Cancel
        </Button>
        <Button type="button" size="sm" disabled={pending} onClick={save}>
          {pending ? "Saving…" : field ? "Save field" : "Add field"}
        </Button>
      </div>
    </div>
  )
}

export function FieldList({ templateId, fields, editable }: { templateId: string; fields: FormField[]; editable: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)

  function remove(fieldId: string) {
    startTransition(async () => {
      await removeFormField(templateId, fieldId)
      router.refresh()
    })
  }

  const sorted = [...fields].sort((a, b) => a.order - b.order)

  return (
    <div className="flex flex-col gap-3">
      {sorted.length === 0 ? <p className="text-sm text-muted-foreground">No fields yet.</p> : null}

      {sorted.map((field) =>
        editingId === field.id ? (
          <FieldEditor key={field.id} templateId={templateId} field={field} order={field.order} onDone={() => setEditingId(null)} />
        ) : (
          <div key={field.id} className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
            <div>
              <p className="font-medium text-foreground">
                {field.order}. {field.label}
                {field.isRequired ? <span className="text-destructive"> *</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">{FIELD_TYPE_LABELS[field.fieldType]}{field.helpText ? ` — ${field.helpText}` : ""}</p>
            </div>
            {editable ? (
              <div className="flex gap-3">
                <button type="button" className="text-xs font-medium text-primary hover:underline" onClick={() => setEditingId(field.id)}>
                  Edit
                </button>
                <button type="button" disabled={pending} className="text-xs font-medium text-destructive hover:underline" onClick={() => remove(field.id)}>
                  Remove
                </button>
              </div>
            ) : null}
          </div>
        )
      )}

      {editable ? (
        adding ? (
          <FieldEditor templateId={templateId} order={sorted.length + 1} onDone={() => setAdding(false)} />
        ) : (
          <Button type="button" size="sm" variant="outline" onClick={() => setAdding(true)}>
            Add field
          </Button>
        )
      ) : null}
    </div>
  )
}
