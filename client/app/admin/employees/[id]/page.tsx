import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FamilyTree } from "@/components/family-tree/family-tree"
import { fetchBands } from "@/lib/api/bands"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments } from "@/lib/api/departments"
import { fetchExitDocumentProgress } from "@/lib/api/exit-documents"
import {
  computeTenure,
  computeTotalBankingExperienceYears,
  employeeFamilyTreeExportUrl,
  fetchEmployee,
  fetchEmployeeFamilyTree,
  fetchEmployeeHistory,
  fetchEmployees,
  fetchReportingManager,
  formatEnumLabel,
  formatTenure,
} from "@/lib/api/employees"
import { fetchPositions } from "@/lib/api/positions"
import { getSession } from "@/lib/get-session"

import { EmployeeRelationsHistory } from "./employee-relations-history"
import { ExitProcessSection } from "./exit-process-section"
import { OnboardingDocumentsSection } from "./onboarding-documents-section"
import {
  addChild,
  addEducation,
  assignPosition,
  changeEmployeeBand,
  processExit,
  rehireEmployee,
  removeChild,
  removeEducation,
  transferEmployee,
  updateBasicInfo,
  updateEmploymentDetails,
  updatePartner,
} from "../actions"
import { ExitDialog } from "./exit-dialog"
import { RegistrationWizard } from "./registration-wizard"
import { RehireDialog } from "./rehire-dialog"

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
    familyTreeResult,
  ] = await Promise.all([
    fetchEmployee(id),
    fetchDepartments(),
    fetchPositions(),
    fetchBands(),
    fetchBranches(),
    fetchEmployees(true),
    fetchEmployeeHistory(id),
    fetchReportingManager(id),
    fetchEmployeeFamilyTree(id),
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

  // Only fetched when relevant — the exit-documents completion gate only
  // matters once the exit process has actually been started (see
  // EmployeesService.processExit()'s doc comment).
  const exitProgressResult =
    employee.employmentStatus === "ACTIVE" && employee.exitInitiatedAt ? await fetchExitDocumentProgress(employee.employeeNumber) : null
  const exitProgress = exitProgressResult?.ok ? exitProgressResult.data : null
  const exitDialogDisabledReason =
    exitProgress && exitProgress.total > 0 && !exitProgress.allCompleted
      ? `${exitProgress.remaining} of ${exitProgress.total} exit document(s) still outstanding — complete them below before confirming the exit.`
      : undefined

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
        <Link
          href={`/admin/professional-profile/${employee.employeeNumber}`}
          className="mt-1 inline-block text-xs font-medium text-primary hover:underline"
        >
          View professional profile (experience, education, certifications, skills) →
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 rounded-lg border border-border bg-muted/20 p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Tenure</p>
          <p className="font-medium text-foreground">{formatTenure(computeTenure(employee.employmentStartDate))}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Total banking experience</p>
          <p className="font-medium text-foreground">
            {(() => {
              const total = computeTotalBankingExperienceYears(employee)
              return total === null ? "—" : `${total} Year${total === 1 ? "" : "s"}`
            })()}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Line manager</p>
          <p className="font-medium text-foreground">
            {managerResult.ok && managerResult.data.manager ? (
              <Link href={`/admin/employees/${managerResult.data.manager.id}`} className="hover:underline">
                {managerResult.data.manager.firstName} {managerResult.data.manager.lastName}
              </Link>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      {employee.employmentStatus === "ACTIVE" ? (
        <div className="flex flex-wrap items-start gap-3">
          <ExitDialog
            employee={employee}
            action={processExit.bind(null, employee.employeeNumber)}
            disabledReason={exitDialogDisabledReason}
          />
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-muted/30 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
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
            <RehireDialog employee={employee} action={rehireEmployee.bind(null, employee.employeeNumber, session?.employeeId ?? "")} />
          </div>
        </div>
      )}

      <ExitProcessSection employee={employee} actingEmployeeId={session?.employeeId ?? ""} />

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

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">Family Tree</CardTitle>
            <CardDescription>
              Partner/children entered above, plus any parents, siblings, and other family members on file (including anyone bulk-imported via the Family Members module).
            </CardDescription>
          </div>
          <a
            href={employeeFamilyTreeExportUrl(employee.employeeNumber, session?.employeeId ?? "")}
            className={buttonVariants({ size: "sm", variant: "outline" })}
          >
            <Download className="mr-1 size-3.5" /> Export Family Tree (PDF)
          </a>
        </CardHeader>
        <CardContent>
          {familyTreeResult.ok ? <FamilyTree tree={familyTreeResult.data} /> : <p className="text-sm text-destructive">{familyTreeResult.error}</p>}
        </CardContent>
      </Card>

      <OnboardingDocumentsSection employee={employee} actingEmployeeId={session?.employeeId ?? ""} />

      <EmployeeRelationsHistory employeeId={employee.employeeNumber} actingEmployeeId={session?.employeeId ?? ""} />
    </div>
  )
}
