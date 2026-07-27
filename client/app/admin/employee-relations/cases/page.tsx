import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import {
  CASE_STATUS_BADGE_VARIANT,
  CASE_STATUS_LABELS,
  fetchDisciplinaryCases,
  formatErEnum,
  type DisciplinaryCaseCategory,
  type DisciplinaryCaseStatus,
} from "@/lib/api/employee-relations"
import { getSession } from "@/lib/get-session"

import { EmployeeRelationsTabs } from "../employee-relations-tabs"

const CATEGORIES: DisciplinaryCaseCategory[] = [
  "MISCONDUCT",
  "ATTENDANCE",
  "INSUBORDINATION",
  "HARASSMENT",
  "DISCRIMINATION",
  "FRAUD",
  "POLICY_VIOLATION",
  "SAFETY_VIOLATION",
  "PERFORMANCE_ISSUE",
  "CONFIDENTIALITY_BREACH",
  "OTHER",
]

interface SearchParams {
  [key: string]: string | undefined
  status?: string
  category?: string
}

export default async function DisciplinaryCasesPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const casesResult = await fetchDisciplinaryCases(
    { status: filters.status as DisciplinaryCaseStatus | undefined, category: filters.category as DisciplinaryCaseCategory | undefined },
    actingEmployeeId
  )

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Employee Relations</h1>
          <p className="text-sm text-muted-foreground">Every disciplinary case you have access to, from draft through closure or appeal.</p>
        </div>
        <Link href="/admin/employee-relations/cases/new" className={buttonVariants({ size: "sm" })}>
          New case
        </Link>
      </div>

      <EmployeeRelationsTabs />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Status</label>
              <Select name="status" defaultValue={filters.status ?? ""} className="w-48">
                <option value="">Any status</option>
                {Object.entries(CASE_STATUS_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Category</label>
              <Select name="category" defaultValue={filters.category ?? ""} className="w-52">
                <option value="">All categories</option>
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {formatErEnum(category)}
                  </option>
                ))}
              </Select>
            </div>
            <button type="submit" className={buttonVariants({ size: "sm", variant: "outline" })}>
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      {!casesResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{casesResult.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : casesResult.data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">No disciplinary cases match these filters.</CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Case #</th>
                  <th className="px-4 py-3 font-medium">Employee</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Subject</th>
                  <th className="px-4 py-3 font-medium">Reported</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {casesResult.data.map((disciplinaryCase) => (
                  <tr key={disciplinaryCase.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{disciplinaryCase.caseNumber}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {disciplinaryCase.employee.firstName} {disciplinaryCase.employee.lastName}
                      {disciplinaryCase.isConfidential ? <Badge variant="secondary" className="ml-1.5">Confidential</Badge> : null}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatErEnum(disciplinaryCase.category)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{disciplinaryCase.subject}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(disciplinaryCase.dateReported).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <Badge variant={CASE_STATUS_BADGE_VARIANT[disciplinaryCase.status]}>{CASE_STATUS_LABELS[disciplinaryCase.status]}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/employee-relations/cases/${disciplinaryCase.id}`} className="text-xs font-medium text-primary hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
