import { PrismaService } from "../prisma/prisma.service"

/**
 * Resolves a "filter by this department" value into itself plus its direct
 * sub-departments (Department.parentDepartmentId) — e.g. filtering the
 * Employees table by "Retail Banking" should also surface staff sitting in
 * "Retail Banking — East Region", a department that reports to it.
 *
 * Units are deliberately NOT resolved separately here: Position.departmentId
 * always points straight at whichever department a unit belongs to (a unit
 * doesn't shift a position's department, it's an extra subdivision within
 * one), so a plain `departmentId` filter already includes every unit under
 * that department without any extra work. Units only needed explicit
 * "sub-department" treatment on the *display* side (the Departments admin
 * page's tree view) — this helper is the other half, for filtering.
 *
 * One level deep by design (matches how the Department admin form/service
 * itself treats the hierarchy — see DepartmentsService.assertParentDepartmentValid's
 * ancestor walk, which supports arbitrary depth for cycle-prevention, but
 * every UI surface in this app currently only expects one level of
 * nesting in practice). If a sub-department itself ever gains its own
 * sub-departments, extend this to walk down another level rather than
 * assuming today's org chart is the ceiling.
 */
export async function resolveDepartmentFilterIds(prisma: PrismaService, departmentId: string): Promise<string[]> {
  const children = await prisma.department.findMany({
    where: { parentDepartmentId: departmentId },
    select: { id: true },
  })
  return [departmentId, ...children.map((child) => child.id)]
}
