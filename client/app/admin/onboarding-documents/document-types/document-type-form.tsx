"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Band } from "@/lib/api/bands"
import type { OrgFunction, Department } from "@/lib/api/departments"
import { DOCUMENT_CATEGORY_LABELS, type OnboardingDocumentCategory, type OnboardingDocumentType } from "@/lib/api/onboarding-documents"
import type { OnboardingActionState } from "@/lib/api/onboarding-documents-actions"
import type { Position } from "@/lib/api/positions"

const CONTRACT_TYPES = [
  { value: "PERMANENT", label: "Permanent" },
  { value: "TEMPORARY", label: "Temporary" },
  { value: "GRADUATE_TRAINEE", label: "Graduate Trainee" },
  { value: "INTERN", label: "Intern" },
]

interface DocumentTypeFormProps {
  documentType?: OnboardingDocumentType
  functions: OrgFunction[]
  departments: Department[]
  positions: Position[]
  bands: Band[]
  action: (prevState: OnboardingActionState | undefined, formData: FormData) => Promise<OnboardingActionState>
  submitLabel: string
}

/** Each "Applicable X" dimension is left empty to mean "applies to
 *  everyone" — see the schema module doc comment. A checkbox group (not a
 *  multi-select) so HR can see every option and its current state at a
 *  glance without needing to ctrl-click. */
function CheckboxGroup({ name, options, selected = [] }: { name: string; options: { value: string; label: string }[]; selected?: string[] }) {
  return options.length === 0 ? (
    <p className="text-xs text-muted-foreground">None configured yet.</p>
  ) : (
    <div className="grid max-h-40 grid-cols-1 gap-1.5 overflow-y-auto rounded-lg border border-border p-3 sm:grid-cols-2">
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name={name}
            value={option.value}
            defaultChecked={selected.includes(option.value)}
            className="size-3.5 rounded border-input"
          />
          {option.label}
        </label>
      ))}
    </div>
  )
}

export function DocumentTypeForm({ documentType, functions, departments, positions, bands, action, submitLabel }: DocumentTypeFormProps) {
  const [state, formAction, pending] = useActionState<OnboardingActionState | undefined, FormData>(action, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Document name</Label>
          <Input id="name" name="name" defaultValue={documentType?.name} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="category">Category</Label>
          <Select id="category" name="category" defaultValue={documentType?.category ?? "OTHER"} required>
            {(Object.entries(DOCUMENT_CATEGORY_LABELS) as [OnboardingDocumentCategory, string][]).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description (optional)</Label>
        <Textarea id="description" name="description" rows={2} defaultValue={documentType?.description ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isMandatory" defaultChecked={documentType?.isMandatory ?? true} className="size-3.5 rounded border-input" />
          Mandatory
        </label>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="effectiveDate">Effective date (optional)</Label>
          <Input id="effectiveDate" name="effectiveDate" type="date" defaultValue={documentType?.effectiveDate?.slice(0, 10) ?? ""} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Applicable contract types (leave all unchecked for every contract type)</Label>
        <CheckboxGroup name="applicableContractTypes" options={CONTRACT_TYPES} selected={documentType?.applicableContractTypes} />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Applicable functions (leave all unchecked for every function)</Label>
        <CheckboxGroup
          name="applicableFunctionIds"
          options={functions.map((f) => ({ value: f.id, label: f.name }))}
          selected={documentType?.applicableFunctionIds}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Applicable departments (leave all unchecked for every department)</Label>
        <CheckboxGroup
          name="applicableDepartmentIds"
          options={departments.map((d) => ({ value: d.id, label: d.name }))}
          selected={documentType?.applicableDepartmentIds}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Applicable positions (leave all unchecked for every position)</Label>
        <CheckboxGroup
          name="applicablePositionIds"
          options={positions.map((p) => ({ value: p.id, label: p.title }))}
          selected={documentType?.applicablePositionIds}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Applicable bands (leave all unchecked for every band)</Label>
        <CheckboxGroup name="applicableBandIds" options={bands.map((b) => ({ value: b.id, label: b.name }))} selected={documentType?.applicableBandIds} />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  )
}
