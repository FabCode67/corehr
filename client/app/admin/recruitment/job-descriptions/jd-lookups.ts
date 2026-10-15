import { fetchBands } from "@/lib/api/bands"
import { fetchDepartments, fetchUnits } from "@/lib/api/departments"
import { fetchPositions } from "@/lib/api/positions"

import type { JdLookups } from "./jd-editor"

/** Option lists for the JD editor's dropdowns (reports to, unit, division, grade). */
export async function fetchJdLookups(): Promise<JdLookups> {
  const [positions, departments, units, bands] = await Promise.all([fetchPositions(), fetchDepartments(), fetchUnits(), fetchBands()])
  const uniq = (values: string[]) => [...new Set(values)].sort((a, b) => a.localeCompare(b))
  return {
    positions: positions.ok ? uniq(positions.data.map((p) => p.title)) : [],
    departments: departments.ok ? uniq(departments.data.map((d) => d.name)) : [],
    units: units.ok ? uniq(units.data.map((u) => u.name)) : [],
    bands: bands.ok ? [...bands.data].sort((a, b) => a.rank - b.rank).map((b) => b.name) : [],
  }
}
