"use client"

import { useActionState, useEffect, useMemo, useState } from "react"

import { Button, buttonVariants } from "@/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import type { ClearanceFormTemplate } from "@/lib/api/exit-clearance"
import type { ExitClearanceActionState } from "@/lib/api/exit-clearance-actions"
import type { Department } from "@/lib/api/departments"
import type { Position } from "@/lib/api/positions"

interface TemplateDialogProps {
  departments: Department[]
  positions: Position[]
  template?: ClearanceFormTemplate
  action: (prevState: ExitClearanceActionState | undefined, formData: FormData) => Promise<ExitClearanceActionState>
  triggerLabel: string
  triggerVariant?: "default" | "outline"
}

/** Create/edit form for one Exit Clearance Form Template — see
 *  schema.prisma's "EXIT CLEARANCE WORKFLOW" module note. The Position
 *  select is filtered to whichever Department is currently chosen, since a
 *  responsible position must belong to its responsible department (enforced
 *  again server-side either way). */
export function TemplateDialog({ departments, positions, template, action, triggerLabel, triggerVariant = "default" }: TemplateDialogProps) {
  const [open, setOpen] = useState(false)
  const [departmentId, setDepartmentId] = useState(template?.responsibleDepartmentId ?? "")
  const [state, formAction, pending] = useActionState<ExitClearanceActionState | undefined, FormData>(action, undefined)

  useEffect(() => {
    if (state && !state.error) {
      setOpen(false)
    }
  }, [state])

  const positionsInDepartment = useMemo(
    () => positions.filter((p) => p.departmentId === departmentId),
    [positions, departmentId]
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ size: "sm", variant: triggerVariant })}>{triggerLabel}</DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{template ? "Edit Exit Clearance Form" : "New Exit Clearance Form"}</DialogTitle>
          <DialogDescription>
            Routed to a department + position in the org structure — whoever currently holds that position can review it.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-1 flex-col overflow-hidden">
          <DialogBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">Form name</Label>
              <Input id="name" name="name" defaultValue={template?.name} placeholder="e.g. Access Card Return" required />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="description">Description (optional)</Label>
              <Textarea id="description" name="description" rows={2} defaultValue={template?.description ?? ""} />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="responsibleDepartmentId">Responsible department</Label>
                <SearchableSelect
                  options={departments.map((dept) => ({ value: dept.id, label: dept.name }))}
                  name="responsibleDepartmentId"
                  value={departmentId}
                  onValueChange={setDepartmentId}
                  placeholder="Select a department…"
                  searchPlaceholder="Search departments…"
                  clearable={false}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor="responsiblePositionId">Responsible position</Label>
                <SearchableSelect
                  options={positionsInDepartment.map((pos) => ({ value: pos.id, label: pos.title }))}
                  name="responsiblePositionId"
                  defaultValue={template?.responsiblePositionId ?? ""}
                  disabled={!departmentId}
                  placeholder={departmentId ? "Select a position…" : "Choose a department first"}
                  searchPlaceholder="Search positions…"
                  clearable={false}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="daysToComplete">Days to complete</Label>
              <Input
                id="daysToComplete"
                name="daysToComplete"
                type="number"
                min={1}
                max={365}
                defaultValue={template?.daysToComplete ?? 7}
                className="max-w-32"
              />
              <p className="text-xs text-muted-foreground">Drives the overdue flag and reminder emails.</p>
            </div>

            <fieldset className="flex flex-col gap-2 rounded-lg border border-border p-3">
              <legend className="px-1 text-sm font-medium text-foreground">Requirements</legend>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="isMandatory" defaultChecked={template?.isMandatory ?? true} className="size-3.5 rounded border-input" />
                Mandatory — blocks exit finalization until completed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="requiresEmployeeCompletion"
                  defaultChecked={template?.requiresEmployeeCompletion ?? true}
                  className="size-3.5 rounded border-input"
                />
                Requires employee completion
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="requiresConfirmation"
                  defaultChecked={template?.requiresConfirmation ?? true}
                  className="size-3.5 rounded border-input"
                />
                Requires reviewer confirmation
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  name="requiresSignature"
                  defaultChecked={template?.requiresSignature ?? false}
                  className="size-3.5 rounded border-input"
                />
                Requires reviewer signature
              </label>
              <p className="text-xs text-muted-foreground">At least one requirement must stay checked.</p>
            </fieldset>

            {state?.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline", size: "sm" })}>Cancel</DialogClose>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Saving…" : template ? "Save changes" : "Create form"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
