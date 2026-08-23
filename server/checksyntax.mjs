import { build } from "esbuild"
import { mkdtempSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"

const files = [
  "src/modules/employees/contract-reminder.scheduler.ts",
  "src/modules/employees/probation-reminder.scheduler.ts",
  "src/modules/employees/employees.module.ts",
  "src/modules/leave/notifications/notifications.service.ts",
  "src/modules/leave/leave-requests/leave-requests.service.ts",
  "src/modules/leave/leave-balances/leave-balances.service.ts",
  "src/modules/learning/assignments/assignments.service.ts",
  "src/modules/learning/assignments/learning-reminder.scheduler.ts",
  "src/modules/onboarding-documents/assignments/assignments.service.ts",
  "src/modules/employees/exit-process/exit-process.service.ts",
  "src/modules/imports/imports.service.ts",
  "src/modules/professional-profile/certifications/certifications.service.ts",
  "src/modules/professional-profile/education/education-records.service.ts",
  "src/modules/forms/signatures/form-signatures.service.ts",
  "src/modules/forms/instances/form-instances.service.ts",
  "src/modules/employee-relations/cases/disciplinary-cases.service.ts",
  "src/modules/employee-relations/sanctions/sanctions.service.ts",
  "src/modules/employee-relations/appeals/appeals.service.ts",
  "src/modules/recruitment/offers/offers.service.ts",
  "src/modules/recruitment/applications/applications.service.ts",
  "src/modules/recruitment/interviews/interviews.service.ts",
  "src/modules/performance/review-periods/performance-reminder.scheduler.ts",
]

const outdir = mkdtempSync(join(tmpdir(), "esb-"))
let hadError = false
try {
  await build({
    entryPoints: files,
    bundle: false,
    write: false,
    format: "cjs",
    platform: "node",
    logLevel: "silent",
  })
  console.log("ALL FILES: syntax OK")
} catch (err) {
  hadError = true
  console.log(err.message)
  if (err.errors) {
    for (const e of err.errors) {
      console.log(`${e.location?.file}:${e.location?.line}:${e.location?.column}: ${e.text}`)
    }
  }
}
process.exit(hadError ? 1 : 0)
