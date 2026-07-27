"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { OrgFunction, Department, UnitWithDepartment } from "@/lib/api/departments"
import type { Band } from "@/lib/api/bands"
import type { Course, Institution, TrainingCategory } from "@/lib/api/learning"
import type { LearningActionState } from "@/lib/api/learning-actions"
import type { Position, PositionLevel } from "@/lib/api/positions"

const CONTRACT_TYPES = ["PERMANENT", "TEMPORARY", "GRADUATE_TRAINEE", "INTERN"] as const

interface CourseFormProps {
  course?: Course
  categories: TrainingCategory[]
  institutions: Institution[]
  functions: OrgFunction[]
  departments: Department[]
  units: UnitWithDepartment[]
  positions: Position[]
  levels: PositionLevel[]
  bands: Band[]
  action: (prevState: LearningActionState | undefined, formData: FormData) => Promise<LearningActionState>
  submitLabel: string
}

function toDateInputValue(value: string | null | undefined) {
  if (!value) return ""
  return value.slice(0, 10)
}

export function CourseForm({
  course,
  categories,
  institutions,
  functions,
  departments,
  units,
  positions,
  levels,
  bands,
  action,
  submitLabel,
}: CourseFormProps) {
  const [state, formAction, pending] = useActionState<LearningActionState | undefined, FormData>(
    action,
    undefined
  )

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <div className="flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-foreground">Basic information</h3>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Course name</Label>
          <Input id="name" name="name" defaultValue={course?.name} required />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Description (optional)</Label>
          <Textarea id="description" name="description" defaultValue={course?.description ?? ""} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="categoryId">Training category</Label>
            <Select id="categoryId" name="categoryId" defaultValue={course?.categoryId ?? ""} required>
              <option value="" disabled>
                Select a category…
              </option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name} {category.isMandatory ? "(Mandatory)" : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="institutionId">Institution / provider (optional)</Label>
            <Select id="institutionId" name="institutionId" defaultValue={course?.institutionId ?? ""}>
              <option value="">None</option>
              {institutions.map((institution) => (
                <option key={institution.id} value={institution.id}>
                  {institution.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="cost">Cost, RWF (optional)</Label>
            <Input id="cost" name="cost" type="number" min={0} defaultValue={course?.cost ?? ""} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="durationHours">Duration, hours (optional)</Label>
            <Input
              id="durationHours"
              name="durationHours"
              type="number"
              min={0}
              defaultValue={course?.durationHours ?? ""}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="deliveryMethod">Delivery method</Label>
            <Select id="deliveryMethod" name="deliveryMethod" defaultValue={course?.deliveryMethod ?? ""} required>
              <option value="" disabled>
                Select a delivery method…
              </option>
              <option value="CLASSROOM">Classroom</option>
              <option value="ONLINE">Online</option>
              <option value="HYBRID">Hybrid</option>
            </Select>
          </div>

          <div />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="startDate">Start date (optional)</Label>
            <Input id="startDate" name="startDate" type="date" defaultValue={toDateInputValue(course?.startDate)} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="endDate">End date (optional)</Label>
            <Input id="endDate" name="endDate" type="date" defaultValue={toDateInputValue(course?.endDate)} />
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Eligibility restrictions</h3>
          <p className="text-xs text-muted-foreground">
            Leave any of these unset to allow every employee regardless of that dimension. An employee must match
            every restriction that is set. E.g. Cyber Security Awareness → Technology Function; Leadership Programme
            → Manager level and above; Executive Leadership → Managing Director level.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requiredFunctionId">Required function</Label>
            <Select id="requiredFunctionId" name="requiredFunctionId" defaultValue={course?.requiredFunctionId ?? ""}>
              <option value="">Any function</option>
              {functions.map((fn) => (
                <option key={fn.id} value={fn.id}>
                  {fn.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requiredDepartmentId">Required department</Label>
            <Select
              id="requiredDepartmentId"
              name="requiredDepartmentId"
              defaultValue={course?.requiredDepartmentId ?? ""}
            >
              <option value="">Any department</option>
              {departments.map((department) => (
                <option key={department.id} value={department.id}>
                  {department.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requiredUnitId">Required unit</Label>
            <Select id="requiredUnitId" name="requiredUnitId" defaultValue={course?.requiredUnitId ?? ""}>
              <option value="">Any unit</option>
              {units.map((unit) => (
                <option key={unit.id} value={unit.id}>
                  {unit.department.name} – {unit.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requiredPositionId">Required position</Label>
            <Select id="requiredPositionId" name="requiredPositionId" defaultValue={course?.requiredPositionId ?? ""}>
              <option value="">Any position</option>
              {positions.map((position) => (
                <option key={position.id} value={position.id}>
                  {position.title}
                  {position.department ? ` (${position.department.name})` : ""}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requiredLevelId">Required position level</Label>
            <Select id="requiredLevelId" name="requiredLevelId" defaultValue={course?.requiredLevelId ?? ""}>
              <option value="">Any level</option>
              {levels.map((level) => (
                <option key={level.id} value={level.id}>
                  {level.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requiredBandId">Required band</Label>
            <Select id="requiredBandId" name="requiredBandId" defaultValue={course?.requiredBandId ?? ""}>
              <option value="">Any band</option>
              {bands.map((band) => (
                <option key={band.id} value={band.id}>
                  {band.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="requiredContractType">Required contract type</Label>
            <Select
              id="requiredContractType"
              name="requiredContractType"
              defaultValue={course?.requiredContractType ?? ""}
            >
              <option value="">Any contract type</option>
              {CONTRACT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type.replaceAll("_", " ")}
                </option>
              ))}
            </Select>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 border-t border-border pt-4">
        <h3 className="text-sm font-semibold text-foreground">Mandatory onboarding assignment</h3>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="autoAssignOnHire"
            defaultChecked={course?.autoAssignOnHire ?? false}
            className="size-4 rounded border-input"
          />
          Automatically assign to every eligible employee on hire (e.g. AML Fundamentals)
        </label>

        <div className="flex flex-col gap-1.5 sm:max-w-64">
          <Label htmlFor="autoAssignDueMonths">Due, months from hire date</Label>
          <Input
            id="autoAssignDueMonths"
            name="autoAssignDueMonths"
            type="number"
            min={1}
            placeholder="12"
            defaultValue={course?.autoAssignDueMonths ?? ""}
          />
        </div>
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
