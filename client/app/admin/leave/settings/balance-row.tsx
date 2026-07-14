"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { adjustLeaveBalance } from "@/lib/api/leave-actions"
import type { LeaveBalance } from "@/lib/api/leave"

export function BalanceRow({ employeeId, balance }: { employeeId: string; balance: LeaveBalance }) {
  const [adjustment, setAdjustment] = useState(balance.adjustmentDays)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function save() {
    setSaved(false)
    startTransition(async () => {
      const formData = new FormData()
      formData.set("adjustmentDays", String(adjustment))
      const result = await adjustLeaveBalance(employeeId, balance.leaveTypeId, balance.year, undefined, formData)
      if (result?.error) setError(result.error)
      else {
        setError(null)
        setSaved(true)
      }
    })
  }

  return (
    <tr>
      <td className="px-4 py-2 font-medium text-foreground">{balance.leaveType.name}</td>
      <td className="px-4 py-2 text-muted-foreground">{balance.entitledDays}</td>
      <td className="px-4 py-2 text-muted-foreground">{balance.carriedForwardDays}</td>
      <td className="px-4 py-2 text-muted-foreground">{balance.takenDays}</td>
      <td className="px-4 py-2 text-muted-foreground">{balance.pendingDays}</td>
      <td className="px-4 py-2 font-medium text-foreground">{balance.remainingDays}</td>
      <td className="px-4 py-2">
        <div className="flex items-center gap-2">
          <Input
            type="number"
            value={adjustment}
            onChange={(event) => setAdjustment(Number(event.target.value))}
            className="h-8 w-20 text-xs"
          />
          <Button type="button" size="xs" variant="outline" onClick={save} disabled={pending}>
            {pending ? "…" : "Save"}
          </Button>
        </div>
        {error ? <p className="mt-1 text-xs text-destructive">{error}</p> : null}
        {saved ? <p className="mt-1 text-xs text-emerald-600">Saved.</p> : null}
      </td>
    </tr>
  )
}
