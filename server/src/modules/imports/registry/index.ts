import type { ImportModuleConfig } from "./types"
import { employeesImportConfig } from "./employees.config"
import { departmentsImportConfig } from "./departments.config"
import { positionsImportConfig } from "./positions.config"
import { leaveImportConfig } from "./leave.config"
import { performanceImportConfig } from "./performance.config"
import { trainingImportConfig } from "./training.config"
import { onboardingDocumentsImportConfig } from "./onboarding-documents.config"
import { formsImportConfig } from "./forms.config"
import { exitImportConfig } from "./exit.config"
import { educationImportConfig } from "./education.config"
import { certificationsImportConfig } from "./certifications.config"
import { familyImportConfig } from "./family.config"
import { salaryImportConfig } from "./salary.config"

/**
 * The entire reusable import framework's extension point. Adding a future
 * module (Recruitment, Payroll, Assets, Medical, Disciplinary, Learning
 * catalogs, ...) means writing one new <name>.config.ts implementing
 * ImportModuleConfig and adding it to this array — nothing in
 * ImportsService, ImportsController, or the client's generic ImportManager
 * component needs to change.
 */
export const IMPORT_MODULES: ImportModuleConfig[] = [
  employeesImportConfig,
  departmentsImportConfig,
  positionsImportConfig,
  leaveImportConfig,
  performanceImportConfig,
  trainingImportConfig,
  onboardingDocumentsImportConfig,
  formsImportConfig,
  exitImportConfig,
  educationImportConfig,
  certificationsImportConfig,
  familyImportConfig,
  salaryImportConfig,
]

export const IMPORT_MODULES_BY_KEY = new Map(IMPORT_MODULES.map((config) => [config.key, config]))

export * from "./types"
