"use client"

import { useActionState, useState } from "react"

import { Button } from "@/components/ui/button"
import { updateLeaveSettings, type LeaveActionState } from "@/lib/api/leave-actions"
import type { LeaveSettings } from "@/lib/api/leave"

const WEEKDAYS = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

export function LeaveSettingsForm({ settings }: { settings: LeaveSettings }) {
  const [state, formAction, pending] = useActionState<LeaveActionState | undefined, FormData>(
    updateLeaveSettings,
    undefined
  )
  const [weekendDays, setWeekendDays] = useState(new Set(settings.weekendDays))

  function toggleDay(day: number) {
    setWeekendDays((prev) => {
      const next = new Set(prev)
      if (next.has(day)) next.delete(day)
      else next.add(day)
      return next
    })
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Weekend days</p>
        <div className="flex flex-wrap gap-3">
          {WEEKDAYS.map((day) => (
            <label key={day.value} className="flex items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                name="weekendDays"
                value={day.value}
                checked={weekendDays.has(day.value)}
                onChange={() => toggleDay(day.value)}
                className="size-4 rounded border-input"
              />
              {day.label}
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="excludeWeekends"
          defaultChecked={settings.excludeWeekends}
          className="size-4 rounded border-input"
        />
        Exclude weekends from leave-day calculations
      </label>
      <label className="flex items-center gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          name="excludePublicHolidays"
          defaultChecked={settings.excludePublicHolidays}
          className="size-4 rounded border-input"
        />
        Exclude public holidays from leave-day calculations
      </label>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </div>
    </form>
  )
}
