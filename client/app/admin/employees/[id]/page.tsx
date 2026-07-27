import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBands } from "@/lib/api/bands"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments } from "@/lib/api/departments"
import {
  fetchEmployee,
  fetchEmployeeHistory,
  fetchEmployees,
  fetchReportingManager,
  formatEnumLabel,
} from "@/lib/api/employees"
import { fetchPositions } from "@/lib/api/positions"
import { getSession } from "@/lib/get-session"

import { EmployeeRelationsHistory } from "./employee-relations-history"
import {
  addChild,
  addEducation,
  assignPosition,
  changeEmployeeBand,
  processExit,
  removeChild,
  removeEducation,
  transferEmployee,
  updateBasicInfo,
  updateEmploymentDetails,
  updatePartner,
} from "../actions"
import { ExitDialog } from "./exit-dialog"
import { RegistrationWizard } from "./registration-wizard"

const STATUS_VARIANT: Record<string, "success" | "destructive"> = {
  ACTIVE: "success",
  EXIT: "destructive",
}

export default async function EmployeeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await getSession()
  const [
    employeeResult,
    departmentsResult,
    positionsResult,
    bandsResult,
    branchesResult,
    employeesResult,
    historyResult,
    managerResult,
  ] = await Promise.all([
    fetchEmployee(id),
    fetchDepartments(),
    fetchPositions(),
    fetchBands(),
    fetchBranches(),
    fetchEmployees(true),
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

  if (
    !departmentsResult.ok ||
    !positionsResult.ok ||
    !bandsResult.ok ||
    !branchesResult.ok ||
    !employeesResult.ok
  ) {
    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>
            {!departmentsResult.ok
              ? departmentsResult.error
              : !positionsResult.ok
                ? positionsResult.error
                : !bandsResult.ok
                  ? bandsResult.error
                  : !branchesResult.ok
                    ? branchesResult.error
                    : !employeesResult.ok
                      ? employeesResult.error
                      : null}
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

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
            {employee.preferredName || employee.firstName} {employee.lastName}
          </h1>
          <Badge variant={STATUS_VARIANT[employee.employmentStatus] ?? "outline"}>
            {employee.employmentStatus === "ACTIVE" ? "Active" : "Exit"}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          {employee.employeeNumber} · {employee.email}
        </p>
      </div>

      {employee.employmentStatus === "ACTIVE" ? (
        <div>
          <ExitDialog employee={employee} action={processExit.bind(null, employee.employeeNumber)} />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <p className="font-medium text-foreground">
            Exited {employee.exitDate?.slice(0, 10)}
            {employee.exitReason ? ` · ${formatEnumLabel(employee.exitReason)}` : ""}
            {employee.exitType ? ` · ${formatEnumLabel(employee.exitType)}` : ""}
          </p>
          {employee.nextMove ? (
            <p className="mt-1 text-xs text-muted-foreground">Next move: {employee.nextMove}</p>
          ) : null}
          {employee.exitComments ? (
            <p className="mt-1 text-xs text-muted-foreground">{employee.exitComments}</p>
          ) : null}
        </div>
      )}

      <RegistrationWizard
        employee={employee}
        departments={departmentsResult.data.filter((department) => department.isActive)}
        positions={positionsResult.data.filter((position) => position.isActive)}
        bands={bandsResult.data.filter((band) => band.isActive)}
        branches={branchesResult.data.filter((branch) => branch.isActive)}
        employeesForPreview={employeesResult.data.map((candidate) => ({
          employeeNumber: candidate.employeeNumber,
          firstName: candidate.firstName,
          lastName: candidate.lastName,
          positionId: candidate.positionId,
          isActive: candidate.isActive,
        }))}
        history={historyResult.ok ? historyResult.data : []}
        reportingManager={managerResult.ok ? managerResult.data : null}
        actions={{
          updateBasicInfo: updateBasicInfo.bind(null, employee.employeeNumber),
          updateEmploymentDetails: updateEmploymentDetails.bind(null, employee.employeeNumber),
          assignPosition: assignPosition.bind(null, employee.employeeNumber),
          transferEmployee: transferEmployee.bind(null, employee.employeeNumber),
          changeEmployeeBand: changeEmployeeBand.bind(null, employee.employeeNumber),
          updatePartner: updatePartner.bind(null, employee.employeeNumber),
          addChild: addChild.bind(null, employee.employeeNumber),
          removeChild: removeChild.bind(null, employee.employeeNumber),
          addEducation: addEducation.bind(null, employee.employeeNumber),
          removeEducation: removeEducation.bind(null, employee.employeeNumber),
        }}
      />

      <EmployeeRelationsHistory employeeId={employee.employeeNumber} actingEmployeeId={session?.employeeId ?? ""} />
    </div>
  )
}
