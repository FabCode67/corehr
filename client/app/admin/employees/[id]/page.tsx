import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBands } from "@/lib/api/bands"
import {
  fetchEmployee,
  fetchEmployeeHistory,
  fetchReportingManager,
} from "@/lib/api/employees"
import { fetchPositions } from "@/lib/api/positions"

import { changeEmployeeBand, deactivateEmployee, transferEmployee, updateEmployee } from "../actions"
import { BandForm } from "./band-form"
import { BasicInfoForm } from "./basic-info-form"
import { TransferForm } from "./transfer-form"

const STATUS_VARIANT: Record<string, "success" | "outline" | "destructive"> = {
  ACTIVE: "success",
  ON_LEAVE: "outline",
  SUSPENDED: "destructive",
  TERMINATED: "destructive",
  RETIRED: "outline",
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [employeeResult, positionsResult, bandsResult, historyResult, managerResult] =
    await Promise.all([
      fetchEmployee(id),
      fetchPositions(),
      fetchBands(),
      fetchEmployeeHistory(id),
      fetchReportingManager(id),
    ])

  if (!employeeResult.ok) {
    if (employeeResult.status === 404) {
      notFound()
    }

    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{employeeResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const employee = employeeResult.data

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin/employees"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to employees
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-foreground">
            {employee.firstName} {employee.lastName}
          </h1>
          <Badge variant={STATUS_VARIANT[employee.employmentStatus] ?? "outline"}>
            {employee.employmentStatus.replaceAll("_", " ")}
          </Badge>
          {!employee.isActive ? <Badge variant="outline">Inactive</Badge> : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {employee.employeeNumber} · {employee.email}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current assignment</CardTitle>
          <CardDescription>
            {employee.position?.title ?? "No position"} ·{" "}
            {employee.position?.unit?.name ?? employee.position?.department.name ?? "—"} · Band{" "}
            {employee.band?.name ?? "—"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {managerResult.ok && managerResult.data.manager ? (
            <p className="text-sm text-muted-foreground">
              Reports to{" "}
              <span className="font-medium text-foreground">
                {managerResult.data.manager.firstName} {managerResult.data.manager.lastName}
              </span>{" "}
              <span className="text-xs">
                (
                {managerResult.data.source === "OVERRIDE"
                  ? "manual override"
                  : "via position hierarchy"}
                )
              </span>
            </p>
          ) : managerResult.ok ? (
            <p className="text-sm text-muted-foreground">No reporting manager on record.</p>
          ) : null}
          <form action={deactivateEmployee.bind(null, employee.id)} className="mt-3">
            <Button type="submit" variant="destructive" size="sm">
              Deactivate employee
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Basic information</CardTitle>
          <CardDescription>Name and contact details.</CardDescription>
        </CardHeader>
        <CardContent>
          <BasicInfoForm employee={employee} action={updateEmployee.bind(null, employee.id)} />
        </CardContent>
      </Card>

      {!positionsResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t load positions</CardTitle>
            <CardDescription>{positionsResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Transfer / reassign position</CardTitle>
            <CardDescription>
              Promotions, demotions, transfers, and reporting-line changes are recorded in the
              position history.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TransferForm
              positions={positionsResult.data.filter((position) => position.isActive)}
              currentPositionId={employee.positionId}
              action={transferEmployee.bind(null, employee.id)}
            />
          </CardContent>
        </Card>
      )}

      {!bandsResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t load bands</CardTitle>
            <CardDescription>{bandsResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Change band</CardTitle>
            <CardDescription>Employee bands are independent of position.</CardDescription>
          </CardHeader>
          <CardContent>
            <BandForm
              bands={bandsResult.data.filter((band) => band.isActive)}
              currentBandId={employee.bandId}
              action={changeEmployeeBand.bind(null, employee.id)}
            />
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Position history</CardTitle>
          <CardDescription>Chronological record of role and band changes.</CardDescription>
        </CardHeader>
        <CardContent>
          {!historyResult.ok ? (
            <p className="text-sm text-destructive">{historyResult.error}</p>
          ) : historyResult.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No history recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-3">
              {historyResult.data
                .slice()
                .sort((a, b) => (a.effectiveFrom < b.effectiveFrom ? 1 : -1))
                .map((entry) => (
                  <li key={entry.id} className="border-b border-border pb-3 last:border-0 last:pb-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{entry.changeType.replaceAll("_", " ")}</Badge>
                      <span className="text-sm font-medium text-foreground">
                        {entry.position.title}
                      </span>
                      <span className="text-xs text-muted-foreground">· Band {entry.band.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Effective {entry.effectiveFrom.slice(0, 10)}
                      {entry.effectiveTo ? ` → ${entry.effectiveTo.slice(0, 10)}` : ""}
                    </p>
                    {entry.changeReason ? (
                      <p className="mt-1 text-sm text-muted-foreground">{entry.changeReason}</p>
                    ) : null}
                  </li>
                ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
