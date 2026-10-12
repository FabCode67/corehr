import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Select } from "@/components/ui/select"
import { fetchBands } from "@/lib/api/bands"
import { fetchBranches } from "@/lib/api/branches"
import { fetchDepartments, fetchFunctions, fetchUnits } from "@/lib/api/departments"
import { formatEnumLabel } from "@/lib/api/employee-utils"
import { fetchSavedViews } from "@/lib/api/hr-analytics"
import { fetchPositionLevels, fetchPositions } from "@/lib/api/positions"

import { SavedViewsPanel } from "./saved-views-panel"

/**
 * The shared analytics filter form + saved views. Used by HR Analytics and
 * the Reports pages (Workforce Report, Data Exports) so the same filters
 * apply everywhere; each page passes its own `basePath` (for Reset) and the
 * current search params. Fetches its own dropdown data so pages that only
 * need filters don't each repeat those requests.
 */
export async function AnalyticsFilters({
  raw,
  basePath,
  actingEmployeeId,
  description = "Applies to every card, chart, and export on this page. Supports single-year, month, quarter, or an explicit date range.",
}: {
  raw: Record<string, string | undefined>
  basePath: string
  actingEmployeeId: string
  description?: string
}) {
  const [functionsResult, departmentsResult, unitsResult, branchesResult, positionsResult, levelsResult, bandsResult, savedViewsResult] =
    await Promise.all([
      fetchFunctions(),
      fetchDepartments(),
      fetchUnits(),
      fetchBranches(),
      fetchPositions(),
      fetchPositionLevels(),
      fetchBands(),
      fetchSavedViews(actingEmployeeId),
    ])

  const functions = functionsResult.ok ? functionsResult.data : []
  const departments = departmentsResult.ok ? departmentsResult.data : []
  const units = unitsResult.ok ? unitsResult.data : []
  const branches = branchesResult.ok ? branchesResult.data : []
  const positions = positionsResult.ok ? positionsResult.data : []
  const levels = levelsResult.ok ? levelsResult.data : []
  const bands = bandsResult.ok ? bandsResult.data : []
  const savedViews = savedViewsResult.ok ? savedViewsResult.data : []

  const currentQuery = Object.fromEntries(Object.entries(raw).filter((entry): entry is [string, string] => Boolean(entry[1])))
  const currentYear = new Date().getUTCFullYear()
  const yearOptions = [currentYear - 3, currentYear - 2, currentYear - 1, currentYear, currentYear + 1]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Filters</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <form method="get" className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Year</label>
            <Select name="year" defaultValue={raw.year ?? ""} className="w-24">
              <option value="">Any</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Quarter</label>
            <Select name="quarter" defaultValue={raw.quarter ?? ""} className="w-24">
              <option value="">Any</option>
              {[1, 2, 3, 4].map((q) => (
                <option key={q} value={q}>
                  Q{q}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Month</label>
            <Select name="month" defaultValue={raw.month ?? ""} className="w-28">
              <option value="">Any</option>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                <option key={m} value={m}>
                  {new Date(Date.UTC(2000, m - 1, 1)).toLocaleString("en-GB", { month: "long" })}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Function</label>
            <SearchableSelect
              options={functions.map((f) => ({ value: f.id, label: f.name }))}
              name="functionId"
              defaultValue={raw.functionId ?? ""}
              placeholder="All functions"
              searchPlaceholder="Search functions…"
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Department</label>
            <SearchableSelect
              options={departments.map((d) => ({ value: d.id, label: d.name }))}
              name="departmentId"
              defaultValue={raw.departmentId ?? ""}
              placeholder="All departments"
              searchPlaceholder="Search departments…"
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Unit</label>
            <SearchableSelect
              options={units.map((u) => ({ value: u.id, label: u.name }))}
              name="unitId"
              defaultValue={raw.unitId ?? ""}
              placeholder="All units"
              searchPlaceholder="Search units…"
              className="w-36"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Branch</label>
            <SearchableSelect
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
              name="branchId"
              defaultValue={raw.branchId ?? ""}
              placeholder="All branches"
              searchPlaceholder="Search branches…"
              className="w-36"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Position</label>
            <SearchableSelect
              options={positions.map((p) => ({ value: p.id, label: p.title }))}
              name="positionId"
              defaultValue={raw.positionId ?? ""}
              placeholder="All positions"
              searchPlaceholder="Search positions…"
              className="w-40"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Position Level</label>
            <SearchableSelect
              options={levels.map((l) => ({ value: l.id, label: l.name }))}
              name="levelId"
              defaultValue={raw.levelId ?? ""}
              placeholder="All levels"
              searchPlaceholder="Search levels…"
              className="w-36"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Band</label>
            <SearchableSelect
              options={bands.map((b) => ({ value: b.id, label: b.name }))}
              name="bandId"
              defaultValue={raw.bandId ?? ""}
              placeholder="All bands"
              searchPlaceholder="Search bands…"
              className="w-32"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Contract Type</label>
            <Select name="contractType" defaultValue={raw.contractType ?? ""} className="w-36">
              <option value="">All contract types</option>
              {["PERMANENT", "TEMPORARY", "GRADUATE_TRAINEE", "INTERN"].map((c) => (
                <option key={c} value={c}>
                  {formatEnumLabel(c)}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Gender</label>
            <Select name="gender" defaultValue={raw.gender ?? ""} className="w-28">
              <option value="">Any</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
            </Select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs text-muted-foreground">Employee Status</label>
            <Select name="employmentStatus" defaultValue={raw.employmentStatus ?? ""} className="w-32">
              <option value="">Any</option>
              <option value="ACTIVE">Active</option>
              <option value="EXIT">Exited</option>
            </Select>
          </div>
          <button type="submit" className="h-9 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
            Apply
          </button>
          <a href={basePath} className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-foreground leading-9 hover:bg-muted">
            Reset
          </a>
        </form>

        <SavedViewsPanel views={savedViews} currentQuery={currentQuery} actingEmployeeId={actingEmployeeId} />
      </CardContent>
    </Card>
  )
}
