"use client"

import { useActionState, useState, useTransition } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import {
  deactivateLeaveType,
  removeAttachmentRequirement,
  replaceApprovalSteps,
  updateLeaveType,
  upsertAttachmentRequirement,
  upsertCarryForwardRule,
  upsertEntitlementRule,
  type LeaveActionState,
} from "@/lib/api/leave-actions"
import {
  LEAVE_CATEGORIES,
  LEAVE_ENTITLEMENT_CATEGORIES,
  type LeaveEntitlementCategory,
  type LeaveType,
} from "@/lib/api/leave"
import { formatEnumLabel } from "@/lib/api/employees"

function formatCategoryLabel(value: string) {
  return formatEnumLabel(value)
}

export function LeaveTypeCard({ leaveType }: { leaveType: LeaveType }) {
  const [state, formAction, pending] = useActionState<LeaveActionState | undefined, FormData>(
    updateLeaveType.bind(null, leaveType.id),
    undefined
  )
  const [category, setCategory] = useState(leaveType.category)

  return (
    <div className="flex flex-col gap-4 rounded-lg border border-border p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground">{leaveType.name}</h3>
          <Badge variant={leaveType.isActive ? "success" : "outline"}>
            {leaveType.isActive ? "Active" : "Inactive"}
          </Badge>
        </div>
        {leaveType.isActive ? (
          <button
            type="button"
            onClick={() => {
              if (window.confirm(`Deactivate ${leaveType.name}?`)) {
                void deactivateLeaveType(leaveType.id)
              }
            }}
            className="text-xs font-medium text-destructive hover:underline"
          >
            Deactivate
          </button>
        ) : null}
      </div>

      <form action={formAction} className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1">
          <Label htmlFor={`name-${leaveType.id}`}>Name</Label>
          <Input id={`name-${leaveType.id}`} name="name" defaultValue={leaveType.name} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`code-${leaveType.id}`}>Code</Label>
          <Input id={`code-${leaveType.id}`} name="code" defaultValue={leaveType.code ?? ""} />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`category-${leaveType.id}`}>Category</Label>
          <Select
            id={`category-${leaveType.id}`}
            name="category"
            value={category}
            onChange={(event) => setCategory(event.target.value as typeof category)}
          >
            {LEAVE_CATEGORIES.map((value) => (
              <option key={value} value={value}>
                {formatCategoryLabel(value)}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`gender-${leaveType.id}`}>Gender restriction</Label>
          <Select id={`gender-${leaveType.id}`} name="genderRestriction" defaultValue={leaveType.genderRestriction ?? ""}>
            <option value="">None</option>
            <option value="MALE">Male only</option>
            <option value="FEMALE">Female only</option>
          </Select>
        </div>

        {category !== "ANNUAL" ? (
          <div className="flex flex-col gap-1">
            <Label htmlFor={`maxDays-${leaveType.id}`}>Max days per year</Label>
            <Input
              id={`maxDays-${leaveType.id}`}
              name="maxDaysPerYear"
              type="number"
              min={0}
              defaultValue={leaveType.maxDaysPerYear ?? undefined}
            />
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <Label htmlFor={`docThreshold-${leaveType.id}`}>Documentation required beyond (days)</Label>
          <Input
            id={`docThreshold-${leaveType.id}`}
            name="documentationThresholdDays"
            type="number"
            min={0}
            placeholder="Always required"
            defaultValue={leaveType.documentationThresholdDays ?? undefined}
          />
        </div>

        <div className="flex flex-col gap-1">
          <Label htmlFor={`excludeWeekends-${leaveType.id}`}>Exclude weekends from day count</Label>
          <Select
            id={`excludeWeekends-${leaveType.id}`}
            name="excludeWeekendsOverride"
            defaultValue={leaveType.excludeWeekendsOverride === null ? "" : String(leaveType.excludeWeekendsOverride)}
          >
            <option value="">Use bank default</option>
            <option value="true">Yes, exclude weekends</option>
            <option value="false">No, include weekends</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor={`excludeHolidays-${leaveType.id}`}>Exclude public holidays from day count</Label>
          <Select
            id={`excludeHolidays-${leaveType.id}`}
            name="excludePublicHolidaysOverride"
            defaultValue={leaveType.excludePublicHolidaysOverride === null ? "" : String(leaveType.excludePublicHolidaysOverride)}
          >
            <option value="">Use bank default</option>
            <option value="true">Yes, exclude public holidays</option>
            <option value="false">No, include public holidays</option>
          </Select>
        </div>

        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="affectsAnnualBalance"
            defaultChecked={leaveType.affectsAnnualBalance}
            className="size-4 rounded border-input"
          />
          Reduces Annual Leave balance
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="requiresDocumentation"
            defaultChecked={leaveType.requiresDocumentation}
            className="size-4 rounded border-input"
          />
          Requires documentation
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="requiresHrApproval"
            defaultChecked={leaveType.requiresHrApproval}
            className="size-4 rounded border-input"
          />
          Requires HR approval
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={leaveType.isActive}
            className="size-4 rounded border-input"
          />
          Active
        </label>

        {state?.error ? (
          <p role="alert" className="col-span-full text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        <div className="col-span-full flex justify-end">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? "Saving…" : "Save"}
          </Button>
        </div>
      </form>

      {leaveType.category === "ANNUAL" ? (
        <EntitlementRulesEditor leaveType={leaveType} />
      ) : null}

      <ApprovalStepsEditor leaveType={leaveType} />
      <CarryForwardEditor leaveType={leaveType} />
      <AttachmentRequirementsEditor leaveType={leaveType} />
    </div>
  )
}

function EntitlementRulesEditor({ leaveType }: { leaveType: LeaveType }) {
  return (
    <div className="rounded-md border border-dashed border-border p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
        Annual entitlement by employee category
      </p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
        {LEAVE_ENTITLEMENT_CATEGORIES.map((category) => {
          const rule = leaveType.entitlementRules.find((r) => r.employeeCategory === category)
          return (
            <EntitlementRuleInput
              key={category}
              leaveTypeId={leaveType.id}
              category={category}
              days={rule?.days ?? 0}
            />
          )
        })}
      </div>
    </div>
  )
}

function EntitlementRuleInput({
  leaveTypeId,
  category,
  days,
}: {
  leaveTypeId: string
  category: LeaveEntitlementCategory
  days: number
}) {
  const [value, setValue] = useState(days)
  const [pending, startTransition] = useTransition()

  return (
    <div className="flex flex-col gap-1">
      <label className="text-[0.65rem] text-muted-foreground">{formatEnumLabel(category)}</label>
      <div className="flex gap-1">
        <Input
          type="number"
          min={0}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          className="h-8 text-xs"
        />
        <Button
          type="button"
          size="xs"
          variant="outline"
          disabled={pending}
          onClick={() =>
            startTransition(() => {
              upsertEntitlementRule(leaveTypeId, category, value)
            })
          }
        >
          {pending ? "…" : "Save"}
        </Button>
      </div>
    </div>
  )
}

function ApprovalStepsEditor({ leaveType }: { leaveType: LeaveType }) {
  const hasLineManager = leaveType.approvalSteps.some((step) => step.role === "LINE_MANAGER")
  const hasHr = leaveType.approvalSteps.some((step) => step.role === "HR")
  const [lineManager, setLineManager] = useState(hasLineManager)
  const [hr, setHr] = useState(hasHr)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function save() {
    const steps: Array<{ order: number; role: "LINE_MANAGER" | "HR" }> = []
    if (lineManager) steps.push({ order: steps.length + 1, role: "LINE_MANAGER" })
    if (hr) steps.push({ order: steps.length + 1, role: "HR" })

    startTransition(async () => {
      const result = await replaceApprovalSteps(leaveType.id, steps)
      setError(result?.error ?? null)
    })
  }

  return (
    <div className="rounded-md border border-dashed border-border p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">
        Approval workflow (in order)
      </p>
      <div className="flex flex-wrap items-center gap-4">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={lineManager}
            onChange={(event) => setLineManager(event.target.checked)}
            className="size-4 rounded border-input"
          />
          Line Manager
        </label>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={hr}
            onChange={(event) => setHr(event.target.checked)}
            className="size-4 rounded border-input"
          />
          HR
        </label>
        <Button type="button" size="xs" variant="outline" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save workflow"}
        </Button>
      </div>
      {!lineManager && !hr ? (
        <p className="mt-1 text-xs text-muted-foreground">
          No steps configured — requests of this type are auto-approved on submission.
        </p>
      ) : null}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function CarryForwardEditor({ leaveType }: { leaveType: LeaveType }) {
  const rule = leaveType.carryForwardRule
  const [enabled, setEnabled] = useState(rule?.enabled ?? false)
  const [maxDays, setMaxDays] = useState(rule?.maxDays ?? 0)
  const [expiresAfterDays, setExpiresAfterDays] = useState(rule?.expiresAfterDays ?? 90)
  const [autoExpiryEnabled, setAutoExpiryEnabled] = useState(rule?.autoExpiryEnabled ?? true)
  const [exemptDepartmentIds, setExemptDepartmentIds] = useState((rule?.exemptDepartmentIds ?? []).join(", "))
  const [exemptEmployeeIds, setExemptEmployeeIds] = useState((rule?.exemptEmployeeIds ?? []).join(", "))
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function save() {
    startTransition(async () => {
      const result = await upsertCarryForwardRule(
        leaveType.id,
        enabled,
        enabled ? maxDays : undefined,
        enabled ? expiresAfterDays : undefined,
        enabled ? autoExpiryEnabled : undefined,
        enabled
          ? exemptDepartmentIds
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean)
          : undefined,
        enabled
          ? exemptEmployeeIds
              .split(",")
              .map((id) => id.trim())
              .filter(Boolean)
          : undefined
      )
      setError(result?.error ?? null)
    })
  }

  return (
    <div className="rounded-md border border-dashed border-border p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Carry-forward rule</p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(event) => setEnabled(event.target.checked)}
            className="size-4 rounded border-input"
          />
          Enabled
        </label>
        {enabled ? (
          <>
            <div className="flex flex-col gap-1">
              <label className="text-[0.65rem] text-muted-foreground">Max days</label>
              <Input
                type="number"
                min={0}
                value={maxDays}
                onChange={(event) => setMaxDays(Number(event.target.value))}
                className="h-8 w-24 text-xs"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[0.65rem] text-muted-foreground">Expires after (days into next year)</label>
              <Input
                type="number"
                min={0}
                value={expiresAfterDays}
                onChange={(event) => setExpiresAfterDays(Number(event.target.value))}
                className="h-8 w-24 text-xs"
              />
            </div>
            <label className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={autoExpiryEnabled}
                onChange={(event) => setAutoExpiryEnabled(event.target.checked)}
                className="size-4 rounded border-input"
              />
              Auto-expire unused carry-forward
            </label>
          </>
        ) : null}
        <Button type="button" size="xs" variant="outline" onClick={save} disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
      </div>
      {enabled ? (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1">
            <label className="text-[0.65rem] text-muted-foreground">Exempt department IDs (comma-separated, uncapped)</label>
            <Input
              value={exemptDepartmentIds}
              onChange={(event) => setExemptDepartmentIds(event.target.value)}
              className="h-8 text-xs"
              placeholder="department UUIDs"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[0.65rem] text-muted-foreground">Exempt employee numbers (comma-separated, uncapped)</label>
            <Input
              value={exemptEmployeeIds}
              onChange={(event) => setExemptEmployeeIds(event.target.value)}
              className="h-8 text-xs"
              placeholder="e.g. EMP-0001, EMP-0042"
            />
          </div>
        </div>
      ) : null}
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function AttachmentRequirementsEditor({ leaveType }: { leaveType: LeaveType }) {
  const [name, setName] = useState("")
  const [isMandatory, setIsMandatory] = useState(true)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function add() {
    if (!name.trim()) return
    startTransition(async () => {
      const result = await upsertAttachmentRequirement(leaveType.id, name.trim(), isMandatory)
      setError(result?.error ?? null)
      if (!result?.error) setName("")
    })
  }

  return (
    <div className="rounded-md border border-dashed border-border p-3">
      <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">Required supporting documents</p>
      {leaveType.attachmentRequirements && leaveType.attachmentRequirements.length > 0 ? (
        <ul className="mb-3 flex flex-col gap-1">
          {leaveType.attachmentRequirements.map((requirement) => (
            <li key={requirement.id} className="flex items-center justify-between rounded border border-border px-2 py-1 text-sm">
              <span>
                {requirement.name}
                {requirement.isMandatory ? null : <span className="ml-1 text-xs text-muted-foreground">(optional)</span>}
              </span>
              <button
                type="button"
                onClick={() => void removeAttachmentRequirement(leaveType.id, requirement.id)}
                className="text-xs font-medium text-destructive hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-xs text-muted-foreground">None configured — this leave type has no named document requirements.</p>
      )}
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1">
          <label className="text-[0.65rem] text-muted-foreground">Document name</label>
          <Input value={name} onChange={(event) => setName(event.target.value)} className="h-8 w-48 text-xs" placeholder="e.g. Medical Certificate" />
        </div>
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" checked={isMandatory} onChange={(event) => setIsMandatory(event.target.checked)} className="size-4 rounded border-input" />
          Mandatory
        </label>
        <Button type="button" size="xs" variant="outline" onClick={add} disabled={pending || !name.trim()}>
          {pending ? "Adding…" : "Add"}
        </Button>
      </div>
      {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
