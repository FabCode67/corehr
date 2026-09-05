"use client"

import { useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import type { Employee } from "@/lib/api/employees"

interface AdminAccessManagerProps {
  /** Active employees only. */
  employees: Employee[]
}

/** Read-only — admin access is auto-computed from the org chart (Human
 *  Resources department = admin, Managing Director excluded regardless; see
 *  server/src/common/admin-eligibility.util.ts) and kept in sync whenever an
 *  employee's position changes, so there is nothing to grant or revoke here
 *  by hand. This list exists purely so HR can see, at a glance, who
 *  currently has admin access and why (their department). */
function AdminAccessRow({ employee }: { employee: Employee }) {
  return (
    <div className="flex flex-col gap-1.5 border-b border-border py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">
          {employee.firstName} {employee.lastName}
          {employee.isAdmin ? (
            <Badge variant="success" className="ml-2 align-middle">
              Admin
            </Badge>
          ) : null}
        </p>
        <p className="truncate text-xs text-muted-foreground">
          {employee.employeeNumber} · {employee.email}
          {employee.position?.department ? ` · ${employee.position.department.name}` : ""}
        </p>
      </div>
    </div>
  )
}

export function AdminAccessManager({ employees }: AdminAccessManagerProps) {
  const [search, setSearch] = useState("")

  const admins = useMemo(() => employees.filter((employee) => employee.isAdmin), [employees])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const sorted = [...admins].sort((a, b) => `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`))
    if (!query) return sorted
    return sorted.filter((employee) =>
      [employee.firstName, employee.lastName, employee.email, employee.employeeNumber, employee.position?.department?.name ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [admins, search])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {admins.length} of {employees.length} active employees currently have admin access.
        </p>
        <Input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by name, email, or department…"
          className="w-full sm:w-72"
        />
      </div>

      <div className="max-h-[32rem] overflow-y-auto rounded-lg border border-border px-4">
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No admins match “{search}”.</p>
        ) : (
          filtered.map((employee) => <AdminAccessRow key={employee.employeeNumber} employee={employee} />)
        )}
      </div>
    </div>
  )
}
