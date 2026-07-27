"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { FormsActionState } from "@/lib/api/forms-actions"
import type { FormCategory, FormTemplate } from "@/lib/api/forms"

interface TemplateFormProps {
  template?: FormTemplate
  categories: FormCategory[]
  departments: { id: string; name: string }[]
  createdById?: string
  action: (prevState: FormsActionState | undefined, formData: FormData) => Promise<FormsActionState>
  submitLabel: string
}

export function TemplateForm({ template, categories, departments, createdById, action, submitLabel }: TemplateFormProps) {
  const [state, formAction, pending] = useActionState<FormsActionState | undefined, FormData>(action, undefined)
  const isCreate = !template

  return (
    <form action={formAction} className="flex flex-col gap-4">
      {isCreate ? <input type="hidden" name="createdById" value={createdById ?? ""} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="title">Title</Label>
          <Input id="title" name="title" defaultValue={template?.title} required />
        </div>
        {isCreate ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="formCode">Form code</Label>
            <Input id="formCode" name="formCode" placeholder="e.g. FORM-0010" required />
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            <Label>Form code</Label>
            <p className="flex h-9 items-center text-sm text-muted-foreground">{template.formCode} (fixed, v{template.version})</p>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea id="description" name="description" defaultValue={template?.description} required />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="purpose">Purpose (optional)</Label>
        <Textarea id="purpose" name="purpose" defaultValue={template?.purpose ?? ""} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="categoryId">Category</Label>
          <Select id="categoryId" name="categoryId" defaultValue={template?.categoryId ?? ""} required>
            <option value="" disabled>
              Select a category…
            </option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="applicableDepartmentId">Applicable department (optional)</Label>
          <Select id="applicableDepartmentId" name="applicableDepartmentId" defaultValue={template?.applicableDepartmentId ?? ""}>
            <option value="">All departments</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="applicableEmployeeCategory">Applicable employee category (optional)</Label>
        <Input
          id="applicableEmployeeCategory"
          name="applicableEmployeeCategory"
          placeholder="e.g. Permanent staff"
          defaultValue={template?.applicableEmployeeCategory ?? ""}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="requirementsInstructions">Requirements / instructions (optional)</Label>
        <Textarea id="requirementsInstructions" name="requirementsInstructions" defaultValue={template?.requirementsInstructions ?? ""} />
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
