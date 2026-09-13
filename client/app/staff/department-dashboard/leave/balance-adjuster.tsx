"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { adjustDepartmentLeaveBalance } from "@/lib/api/department-dashboard-actions"
import type { LeaveBalance } from "@/lib/api/leave"

/** Department-scoped counterpart to admin/leave/settings/balance-row.tsx's
 *  BalanceRow — same inline-edit UX, just posting through
 *  adjustDepartmentLeaveBalance() (DepartmentDashboardService.adjustLeaveBalance)
 *  instead of the admin-only /leave/balances endpoint directly. */
export function DepartmentBalanceAdjuster({
  departmentId,
  actingEmployeeId,
  employeeId,
  balance,
}: {
  departmentId: string
  actingEmployeeId: string
  employeeId: string
  balance: LeaveBalance
}) {
  const [adjustment, setAdjustment] = useState(balance.adjustmentDays)
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  function save() {
    setSaved(false)
    startTransition(async () => {
      const formData = new FormData()
      formData.set("adjustmentDays", String(adjustment))
      const result = await adjustDepartmentLeaveBalance(
        departmentId,
        actingEmployeeId,
        employeeId,
        balance.leaveTypeId,
        balance.year,
        undefined,
        formData
      )
      if (result?.error) {
        setError(result.error)
      } else {
        setError(null)
        setSaved(true)
      }
    })
  }

  return (
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
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {saved ? <p className="text-xs text-emerald-600">Saved.</p> : null}
    </div>
  )
}
