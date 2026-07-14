"use client"

import { useActionState, useState, useTransition } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createHoliday, removeHoliday, type LeaveActionState } from "@/lib/api/leave-actions"
import type { PublicHoliday } from "@/lib/api/leave"

export function HolidaysPanel({ holidays }: { holidays: PublicHoliday[] }) {
  const [state, formAction, pending] = useActionState<LeaveActionState | undefined, FormData>(
    createHoliday,
    undefined
  )

  const sorted = [...holidays].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <div className="flex flex-col gap-4">
      {sorted.length === 0 ? (
        <p className="py-4 text-center text-sm text-muted-foreground">No holidays configured yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border text-left text-xs text-muted-foreground uppercase">
              <tr>
                <th className="py-2 font-medium">Name</th>
                <th className="py-2 font-medium">Date</th>
                <th className="py-2 font-medium">Recurs annually</th>
                <th className="py-2 font-medium">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {sorted.map((holiday) => (
                <HolidayRow key={holiday.id} holiday={holiday} />
              ))}
            </tbody>
          </table>
        </div>
      )}

      <form action={formAction} className="flex flex-wrap items-end gap-2 border-t border-border pt-4">
        <div className="flex flex-col gap-1">
          <Label htmlFor="holiday-name" className="text-xs text-muted-foreground">
            Holiday name
          </Label>
          <Input id="holiday-name" name="name" placeholder="e.g. Umuganura Day" className="w-52" required />
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="holiday-date" className="text-xs text-muted-foreground">
            Date
          </Label>
          <Input id="holiday-date" name="date" type="date" required />
        </div>
        <label className="mb-2 flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" name="isRecurringAnnually" className="size-4 rounded border-input" />
          Recurs every year
        </label>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Adding…" : "Add holiday"}
        </Button>
        {state?.error ? <p className="w-full text-xs text-destructive">{state.error}</p> : null}
      </form>
    </div>
  )
}

function HolidayRow({ holiday }: { holiday: PublicHoliday }) {
  const [pending, startTransition] = useTransition()
  const [removed, setRemoved] = useState(false)

  if (removed) return null

  return (
    <tr>
      <td className="py-2 font-medium text-foreground">{holiday.name}</td>
      <td className="py-2 text-muted-foreground">{holiday.date.slice(0, 10)}</td>
      <td className="py-2">
        <Badge variant={holiday.isRecurringAnnually ? "success" : "outline"}>
          {holiday.isRecurringAnnually ? "Yes" : "No"}
        </Badge>
      </td>
      <td className="py-2 text-right">
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!window.confirm(`Remove ${holiday.name}?`)) return
            startTransition(async () => {
              await removeHoliday(holiday.id)
              setRemoved(true)
            })
          }}
          className="text-xs font-medium text-destructive hover:underline"
        >
          {pending ? "Removing…" : "Remove"}
        </button>
      </td>
    </tr>
  )
}
