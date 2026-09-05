import { Prisma, PrismaClient } from "@prisma/client"

/** The one Department name this app treats as "HR" for auto-admin purposes.
 *  Seeded as "Human Resources" under the Support Function (seed.ts). If this
 *  department is ever renamed, update this constant to match. Departments
 *  reporting to this one (see Department.parentDepartmentId's one-level-deep
 *  hierarchy — same convention as department-hierarchy.util.ts) count too,
 *  so an HR sub-department's positions are admin-eligible as well. */
export const HR_DEPARTMENT_NAME = "Human Resources"

/** Position titles excluded from admin auto-grant regardless of department
 *  placement — per the "HR people are admins, but the Managing Director is
 *  not" requirement. The seeded Managing Director sits under Executive
 *  Management, not Human Resources, so department placement alone already
 *  excludes it — this list is a defensive second check in case an MD-style
 *  position is ever placed inside HR by mistake. */
const ADMIN_EXCLUDED_POSITION_TITLES = ["Managing Director"]

/** The PositionLevel.code this codebase already uses elsewhere (see
 *  LeaveBalancesService.resolveEntitlementCategory) as the canonical "this
 *  is the Managing Director's level" check — more robust than matching on
 *  title text, since a level code is a deliberate, stable identifier while
 *  titles are free text. Reused here as a second, independent exclusion. */
const MANAGING_DIRECTOR_LEVEL_CODE = "E1"

/**
 * Computes whether a position should carry admin access: true for every
 * position inside the Human Resources department (including its direct
 * sub-departments), false for everything else, and false unconditionally
 * for the Managing Director (by title or by level code — either match
 * excludes).
 *
 * This is the single source of truth for Employee.isAdmin — call it
 * anywhere Employee.positionId changes (assignPosition, transferPosition,
 * processExit, rehire) so the stored flag never drifts out of sync with the
 * org chart. There is no manual override anywhere in the app; isAdmin is a
 * cache of this computation, not an independently-set value.
 */
export async function computeIsAdminForPosition(prisma: PrismaClient | Prisma.TransactionClient, positionId: string | null): Promise<boolean> {
  if (!positionId) return false

  const position = await prisma.position.findUnique({
    where: { id: positionId },
    select: {
      title: true,
      level: { select: { code: true } },
      department: { select: { name: true, parentDepartment: { select: { name: true } } } },
    },
  })
  if (!position) return false

  if (ADMIN_EXCLUDED_POSITION_TITLES.some((title) => title.toLowerCase() === position.title.toLowerCase())) {
    return false
  }
  if (position.level?.code === MANAGING_DIRECTOR_LEVEL_CODE) {
    return false
  }

  const departmentName = position.department?.name
  const parentDepartmentName = position.department?.parentDepartment?.name
  return departmentName === HR_DEPARTMENT_NAME || parentDepartmentName === HR_DEPARTMENT_NAME
}
