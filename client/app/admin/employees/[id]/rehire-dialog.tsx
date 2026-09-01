"use client"

import { useActionState, useEffect, useState } from "react"
import { RotateCcw } from "lucide-react"

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

interface RehireDialogProps {
  employee: Employee
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
}

/** Rehire. The reverse of ExitDialog/processExit — reactivates the same
 *  employee record rather than creating a new one (see
 *  EmployeesService.rehire()'s doc comment). Only rendered for employees
 *  with Exit status. */
export function RehireDialog({ employee, action }: RehireDialogProps) {
  const [open, setOpen] = useState(false)
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(action, undefined)

  useEffect(() => {
    if (state && !state.error) {
      setOpen(false)
    }
  }, [state])

  const fullName = `${employee.firstName} ${employee.lastName}`
  const today = new Date().toISOString().slice(0, 10)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={buttonVariants({ variant: "outline", size: "sm" })}>
        <RotateCcw className="size-3.5" />
        Rehire
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Rehire {fullName}</DialogTitle>
          <DialogDescription>
            Reactivates this employee record. Position, band, and contract details are cleared — you&apos;ll go through Position Assignment again
            afterward.
          </DialogDescription>
        </DialogHeader>

        <form action={formAction} className="flex flex-1 flex-col overflow-hidden">
          <DialogBody className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="employmentStartDate">New employment start date</Label>
              <Input id="employmentStartDate" name="employmentStartDate" type="date" defaultValue={today} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="comments">Notes (optional)</Label>
              <Textarea id="comments" name="comments" rows={3} placeholder="Reason for rehire, circumstances, agreed terms…" />
            </div>

            {state?.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
          </DialogBody>

          <DialogFooter>
            <DialogClose className={buttonVariants({ variant: "outline", size: "sm" })}>Cancel</DialogClose>
            <Button type="submit" size="sm" disabled={pending}>
              {pending ? "Rehiring…" : "Confirm Rehire"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
