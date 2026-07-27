import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select } from "@/components/ui/select"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments, fetchFunctions } from "@/lib/api/departments"
import {
  fetchComplianceByBand,
  fetchComplianceByBranch,
  fetchCostAnalysis,
  fetchDepartmentAnalysis,
  fetchFunctionAnalysis,
  fetchInstitutionAnalysis,
  fetchTrainingCategories,
  type LearningAnalyticsFilters,
} from "@/lib/api/learning"

import { LearningTabs } from "../learning-tabs"

interface SearchParams {
  categoryId?: string
  departmentId?: string
  branchId?: string
  functionId?: string
}

export default async function LearningReportsPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  const filters = await searchParams
  const analyticsFilters: LearningAnalyticsFilters = {
    categoryId: filters.categoryId,
    departmentId: filters.departmentId,
    branchId: filters.branchId,
    functionId: filters.functionId,
  }

  const [
    categoriesResult,
    departmentsResult,
    branchesResult,
    functionsResult,
    departmentAnalysisResult,
    functionAnalysisResult,
    institutionAnalysisResult,
    costAnalysisResult,
    complianceByBranchResult,
    complianceByBandResult,
  ] = await Promise.all([
    fetchTrainingCategories(),
    fetchDepartments(),
    fetchBranches(),
    fetchFunctions(),
    fetchDepartmentAnalysis(analyticsFilters),
    fetchFunctionAnalysis(analyticsFilters),
    fetchInstitutionAnalysis(analyticsFilters),
    fetchCostAnalysis(analyticsFilters),
    fetchComplianceByBranch(analyticsFilters),
    fetchComplianceByBand(analyticsFilters),
  ])

  const categories = categoriesResult.ok ? categoriesResult.data : []
  const departments = departmentsResult.ok ? departmentsResult.data : []
  const branches = branchesResult.ok ? branchesResult.data : []
  const functions = functionsResult.ok ? functionsResult.data : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Learning & Development</h1>
        <p className="text-sm text-muted-foreground">
          Reports are shown on screen. Excel / CSV / PDF / PowerPoint exports are not yet available in this build.
        </p>
      </div>

      <LearningTabs />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" className="flex flex-wrap items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Category</label>
              <Select name="categoryId" defaultValue={filters.categoryId ?? ""} className="w-44">
                <option value="">All categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Function</label>
              <Select name="functionId" defaultValue={filters.functionId ?? ""} className="w-40">
                <option value="">All functions</option>
                {functions.map((fn) => (
                  <option key={fn.id} value={fn.id}>
                    {fn.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Department</label>
              <Select name="departmentId" defaultValue={filters.departmentId ?? ""} className="w-40">
                <option value="">All departments</option>
                {departments.map((department) => (
                  <option key={department.id} value={department.id}>
                    {department.name}
                  </option>
                ))}
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-muted-foreground">Branch</label>
              <Select name="branchId" defaultValue={filters.branchId ?? ""} className="w-40">
                <option value="">All branches</option>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </Select>
            </div>
            <button
              type="submit"
              className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80"
            >
              Apply
            </button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Department analysis</CardTitle>
          <CardDescription>Completion rate, average training hours/cost, and outstanding mandatory courses.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!departmentAnalysisResult.ok || departmentAnalysisResult.data.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No data for this selection.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="py-2 pr-3 font-medium">Department</th>
                  <th className="py-2 pr-3 font-medium">Completion rate</th>
                  <th className="py-2 pr-3 font-medium">Avg. hours</th>
                  <th className="py-2 pr-3 font-medium">Avg. cost</th>
                  <th className="py-2 pr-3 font-medium">Outstanding mandatory</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {departmentAnalysisResult.data.map((row) => (
                  <tr key={row.departmentId}>
                    <td className="py-2 pr-3 font-medium text-foreground">{row.departmentName}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.completionRate}%</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.averageTrainingHours}</td>
                    <td className="py-2 pr-3 text-muted-foreground">RWF {row.averageTrainingCost.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.outstandingMandatoryCourses}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Function analysis</CardTitle>
          <CardDescription>Compare training performance across Technology, Operations, Finance, HR, Risk, Business, and Executive Management.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!functionAnalysisResult.ok || functionAnalysisResult.data.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No data for this selection.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="py-2 pr-3 font-medium">Function</th>
                  <th className="py-2 pr-3 font-medium">Completion rate</th>
                  <th className="py-2 pr-3 font-medium">Avg. hours</th>
                  <th className="py-2 pr-3 font-medium">Avg. cost</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {functionAnalysisResult.data.map((row) => (
                  <tr key={row.functionId}>
                    <td className="py-2 pr-3 font-medium text-foreground">{row.functionName}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.completionRate}%</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.averageTrainingHours}</td>
                    <td className="py-2 pr-3 text-muted-foreground">RWF {row.averageTrainingCost.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Mandatory compliance by branch</CardTitle>
          </CardHeader>
          <CardContent>
            {!complianceByBranchResult.ok || complianceByBranchResult.data.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No data.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {complianceByBranchResult.data.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between">
                    <span className="text-foreground">{entry.name}</span>
                    <span className="text-muted-foreground">
                      {entry.compliancePercent}% ({entry.completedMandatory}/{entry.totalMandatory})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Mandatory compliance by band</CardTitle>
          </CardHeader>
          <CardContent>
            {!complianceByBandResult.ok || complianceByBandResult.data.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">No data.</p>
            ) : (
              <ul className="flex flex-col gap-2 text-sm">
                {complianceByBandResult.data.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between">
                    <span className="text-foreground">{entry.name}</span>
                    <span className="text-muted-foreground">
                      {entry.compliancePercent}% ({entry.completedMandatory}/{entry.totalMandatory})
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Institution analysis</CardTitle>
          <CardDescription>Courses delivered, cost, and average completion rate by institution.</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {!institutionAnalysisResult.ok || institutionAnalysisResult.data.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">No data for this selection.</p>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="py-2 pr-3 font-medium">Institution</th>
                  <th className="py-2 pr-3 font-medium">Courses delivered</th>
                  <th className="py-2 pr-3 font-medium">Total cost</th>
                  <th className="py-2 pr-3 font-medium">Avg. completion rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {institutionAnalysisResult.data.map((row) => (
                  <tr key={row.institutionId}>
                    <td className="py-2 pr-3 font-medium text-foreground">{row.institutionName}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.coursesDelivered}</td>
                    <td className="py-2 pr-3 text-muted-foreground">RWF {row.totalCost.toLocaleString()}</td>
                    <td className="py-2 pr-3 text-muted-foreground">{row.averageCompletionRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Cost analysis</CardTitle>
          <CardDescription>
            {costAnalysisResult.ok
              ? `Total: RWF ${costAnalysisResult.data.totalCost.toLocaleString()} · RWF ${costAnalysisResult.data.costPerEmployee.toLocaleString()} per employee`
              : "Total training cost across the organization."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!costAnalysisResult.ok ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{costAnalysisResult.error}</p>
          ) : (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">By department</p>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {costAnalysisResult.data.costByDepartment.map((row) => (
                    <li key={row.departmentId} className="flex items-center justify-between">
                      <span className="text-foreground">{row.name}</span>
                      <span className="text-muted-foreground">RWF {row.cost.toLocaleString()}</span>
                    </li>
                  ))}
                  {costAnalysisResult.data.costByDepartment.length === 0 ? (
                    <li className="text-muted-foreground">No data.</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">By institution</p>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {costAnalysisResult.data.costByInstitution.map((row) => (
                    <li key={row.institutionId} className="flex items-center justify-between">
                      <span className="text-foreground">{row.name}</span>
                      <span className="text-muted-foreground">RWF {row.cost.toLocaleString()}</span>
                    </li>
                  ))}
                  {costAnalysisResult.data.costByInstitution.length === 0 ? (
                    <li className="text-muted-foreground">No data.</li>
                  ) : null}
                </ul>
              </div>
              <div>
                <p className="mb-2 text-xs font-medium text-muted-foreground uppercase">By category</p>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {costAnalysisResult.data.costByCategory.map((row) => (
                    <li key={row.categoryName} className="flex items-center justify-between">
                      <span className="text-foreground">{row.name}</span>
                      <span className="text-muted-foreground">RWF {row.cost.toLocaleString()}</span>
                    </li>
                  ))}
                  {costAnalysisResult.data.costByCategory.length === 0 ? (
                    <li className="text-muted-foreground">No data.</li>
                  ) : null}
                </ul>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
