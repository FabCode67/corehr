"use client"

import { useActionState, useMemo, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import type { Employee } from "@/lib/api/employees"

import { setAdminAccess, type ActionState } from "./actions"

interface AdminAccessManagerProps {
  /** Active employees only — an inactive employee can't be granted admin
   *  access anyway (see EmployeesService.setAdminAccess()'s guard), so
   *  there's nothing useful to show for them here. */
  employees: Employee[]
}

function AdminAccessRow({ employee, isLastAdmin }: { employee: Employee; isLastAdmin: boolean }) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    setAdminAccess.bind(null, employee.employeeNumber, !employee.isAdmin),
    undefined
  )

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

      <form action={formAction} className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
        <Button
          type="submit"
          size="sm"
          variant={employee.isAdmin ? "outline" : "default"}
          disabled={pending || (employee.isAdmin && isLastAdmin)}
          title={employee.isAdmin && isLastAdmin ? "Cannot remove the last remaining admin." : undefined}
        >
          {pending ? "Saving…" : employee.isAdmin ? "Revoke admin access" : "Grant admin access"}
        </Button>
        {state?.error ? (
          <p role="alert" className="text-xs text-destructive">
            {state.error}
          </p>
        ) : employee.isAdmin && isLastAdmin ? (
          <p className="text-xs text-muted-foreground">Last remaining admin</p>
        ) : null}
      </form>
    </div>
  )
}

export function AdminAccessManager({ employees }: AdminAccessManagerProps) {
  const [search, setSearch] = useState("")

  const adminCount = useMemo(() => employees.filter((employee) => employee.isAdmin).length, [employees])

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase()
    const sorted = [...employees].sort((a, b) => {
      if (a.isAdmin !== b.isAdmin) return a.isAdmin ? -1 : 1
      return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
    })
    if (!query) return sorted
    return sorted.filter((employee) =>
      [
        employee.firstName,
        employee.lastName,
        employee.email,
        employee.employeeNumber,
        employee.position?.department?.name ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    )
  }, [employees, search])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {adminCount} of {employees.length} active employees currently have admin access.
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
          <p className="py-6 text-center text-sm text-muted-foreground">No employees match “{search}”.</p>
        ) : (
          filtered.map((employee) => (
            <AdminAccessRow
              key={employee.employeeNumber}
              employee={employee}
              isLastAdmin={employee.isAdmin && adminCount <= 1}
            />
          ))
        )}
      </div>
    </div>
  )
}
