import type { AnnualLeavePlanEntry } from "@/lib/api/annual-leave-plan"
import { MONTH_KEYS, MONTH_LABELS } from "@/lib/api/annual-leave-plan-utils"
import { fullName } from "@/lib/format-name"

/** Shared table rendering for the Annual Leave Plan — used by both the
 *  Head of Department's own-department view
 *  (staff/department-dashboard/leave-plan) and HR's bank-wide view
 *  (admin/leave/annual-plan), so the two stay visually identical. HR's view
 *  passes `showDepartment` since its rows can span every department at
 *  once. */
export function AnnualLeavePlanTable({
  rows,
  year,
  showDepartment = false,
}: {
  rows: AnnualLeavePlanEntry[]
  year: number
  showDepartment?: boolean
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full whitespace-nowrap text-sm">
        <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
          <tr>
            {showDepartment ? <th className="px-3 py-3 font-medium">Department</th> : null}
            <th className="px-3 py-3 font-medium">Staff ID</th>
            <th className="px-3 py-3 font-medium">Staff Name</th>
            <th className="px-3 py-3 font-medium">{year - 1} CF Balance</th>
            <th className="px-3 py-3 font-medium">{year} Leave Days</th>
            <th className="px-3 py-3 font-medium">Total Entitled</th>
            <th className="px-3 py-3 font-medium">Leave Taken</th>
            <th className="px-3 py-3 font-medium">Leave Balance</th>
            {MONTH_KEYS.map((month) => (
              <th key={month} className="px-3 py-3 font-medium">
                {MONTH_LABELS[month]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-muted/30">
              {showDepartment ? <td className="px-3 py-2 text-muted-foreground">{row.department.name}</td> : null}
              <td className="px-3 py-2 text-muted-foreground">{row.employee.employeeNumber}</td>
              <td className="px-3 py-2 font-medium text-foreground">{fullName(row.employee)}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.carryForwardBalance}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.annualEntitlement}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.totalEntitled}</td>
              <td className="px-3 py-2 text-muted-foreground">{row.leaveTaken}</td>
              <td className={`px-3 py-2 font-medium ${row.leaveBalance < 0 ? "text-destructive" : "text-foreground"}`}>
                {row.leaveBalance}
              </td>
              {MONTH_KEYS.map((month) => (
                <td key={month} className="px-3 py-2 text-muted-foreground">
                  {row[month] > 0 ? row[month] : ""}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
