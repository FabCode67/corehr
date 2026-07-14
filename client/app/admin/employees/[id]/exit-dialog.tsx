"use client"

import { useActionState, useEffect, useState } from "react"
import { AlertTriangle } from "lucide-react"

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
import { Textarea } from "@/components/ui/textarea"
import type { Employee } from "@/lib/api/employees"

import type { ActionState } from "../actions"

interface ExitDialogProps {
  employee: Employee
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
}

const EXIT_REASONS = [
  { value: "RESIGNATION", label: "Resignation", description: "Employee voluntarily resigned" },
  { value: "TERMINATION", label: "Termination", description: "Employment terminated by the bank" },
  { value: "END_OF_CONTRACT", label: "End of Contract", description: "Temporary contract reached its end" },
] as const

const EXIT_TYPES = [
  { value: "REGRETTABLE", label: "Regrettable", description: "Bank wished to retain this employee" },
  { value: "NON_REGRETTABLE", label: "Non-Regrettable", description: "Bank accepts the departure" },
] as const

/** Exit Management. A dedicated dialog rather than a one-click action,
 *  since processing an exit is a deliberate, one-way change that closes
 *  out the employee's position assignment — matches the provided design. */
export function ExitDialog({ employee, action }: ExitDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )

  useEffect(() => {
    if (state && !state.error) {
      setOpen(false)
    }
  }, [state])

  const initials = `${employee.firstName[0] ?? ""}${employee.lastName[0] ?? ""}`.toUpperCase()
  const fullName = `${employee.firstName} ${employee.lastName}`

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "destructive", size: "sm" })}>
        Process Employee Exit
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-destructive font-semibold text-white">
            {initials}
          </div>
          <div>
            <DialogTitle>Process Employee Exit</DialogTitle>
            <DialogDescription>{fullName}</DialogDescription>
          </div>
        </DialogHeader>

        <form action={formAction} className="flex flex-1 flex-col overflow-hidden">
          <DialogBody className="flex flex-col gap-5">
            <div className="flex gap-2 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-3 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              <div>
                <p className="font-medium">This action will:</p>
                <ul className="mt-1 list-disc pl-4 text-xs">
                  <li>Set employee status to Inactive</li>
                  <li>End their current position assignment</li>
                  <li>Mark their position as Vacant</li>
                </ul>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="exitDate">
                Exit Date <span className="text-destructive">*</span>
              </Label>
              <Input id="exitDate" name="exitDate" type="date" required />
            </div>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-foreground">
                Reason for Exit <span className="text-destructive">*</span>
              </legend>
              {EXIT_REASONS.map((reason) => (
                <label
                  key={reason.value}
                  className="flex cursor-pointer items-start gap-3 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                >
                  <input
                    type="radio"
                    name="exitReason"
                    value={reason.value}
                    required
                    className="mt-1 size-4 accent-primary"
                  />
                  <span>
                    <span className="block font-medium text-foreground">{reason.label}</span>
                    <span className="block text-xs text-muted-foreground">{reason.description}</span>
                  </span>
                </label>
              ))}
            </fieldset>

            <fieldset className="flex flex-col gap-2">
              <legend className="mb-1 text-sm font-medium text-foreground">
                Type of Exit <span className="text-destructive">*</span>
              </legend>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {EXIT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className="flex cursor-pointer flex-col gap-0.5 rounded-lg border border-border px-3 py-2.5 text-sm transition-colors has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <span className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="exitType"
                        value={type.value}
                        required
                        className="size-4 accent-primary"
                      />
                      <span className="font-medium text-foreground">{type.label}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{type.description}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="nextMove">Next Move (optional)</Label>
              <Input
                id="nextMove"
                name="nextMove"
                placeholder="e.g. Joined BK Group, Furthering studies, Unknown…"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="comments">Comments (optional)</Label>
              <Textarea
                id="comments"
                name="comments"
                rows={3}
                placeholder="Additional context, interview notes, circumstances…"
              />
            </div>

            {state?.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline", size: "sm" })}>
              Cancel
            </DialogClose>
            <Button type="submit" variant="destructive" size="sm" disabled={pending}>
              {pending ? "Processing…" : "Confirm Exit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
