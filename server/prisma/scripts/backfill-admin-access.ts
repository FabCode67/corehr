/**
 * One-off backfill for the "admin access is auto-computed from department"
 * change (see server/src/common/admin-eligibility.util.ts). Recomputes
 * Employee.isAdmin for every employee from their current position, exactly
 * the same way assignPosition()/transferPosition() do it going forward —
 * this just catches every row that was set by the old manual Admin Access
 * toggle (or by seed data before that toggle was removed) and brings it in
 * line with the new rule in one pass.
 *
 * Safe to re-run — it's a pure recomputation, not additive.
 *
 * Usage: npx ts-node prisma/scripts/backfill-admin-access.ts
 *   (or:  npx tsx prisma/scripts/backfill-admin-access.ts)
 */
import { PrismaClient } from "@prisma/client"

import { computeIsAdminForPosition } from "../../src/common/admin-eligibility.util"

const prisma = new PrismaClient()

async function main() {
  const employees = await prisma.employee.findMany({
    select: { employeeNumber: true, firstName: true, lastName: true, positionId: true, isAdmin: true },
  })

  let changed = 0
  for (const employee of employees) {
    const nextIsAdmin = await computeIsAdminForPosition(prisma, employee.positionId)
    if (nextIsAdmin === employee.isAdmin) continue

    await prisma.employee.update({
      where: { employeeNumber: employee.employeeNumber },
      data: { isAdmin: nextIsAdmin },
    })
    changed += 1
    console.log(`${employee.employeeNumber} (${employee.firstName} ${employee.lastName}): isAdmin ${employee.isAdmin} -> ${nextIsAdmin}`)
  }

  console.log(`\nDone. ${changed} of ${employees.length} employees updated.`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
