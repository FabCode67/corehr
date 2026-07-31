import { Module } from "@nestjs/common"

import { EmployeeRelationsAnalyticsModule } from "../employee-relations/analytics/employee-relations-analytics.module"
import { EmployeesModule } from "../employees/employees.module"
import { LearningAnalyticsModule } from "../learning/analytics/analytics.module"
import { LeaveAnalyticsModule } from "../leave/leave-analytics/leave-analytics.module"
import { AssignmentsModule as OnboardingDocumentAssignmentsModule } from "../onboarding-documents/assignments/assignments.module"
import { PerformanceAnalyticsModule } from "../performance/analytics/analytics.module"
import { RecruitmentAnalyticsModule } from "../recruitment/analytics/analytics.module"
import { ExecutiveDashboardController } from "./executive-dashboard.controller"
import { ExecutiveDashboardPdfService } from "./executive-dashboard-pdf.service"
import { ExecutiveDashboardService } from "./executive-dashboard.service"

/**
 * Pure aggregator: imports the eight already-independent analytics/domain
 * modules and composes their exported services in ExecutiveDashboardService.
 * None of the eight import each other in a cycle back to this module (each
 * was checked individually — see EmployeesModule, which imports Learning's
 * AssignmentsModule under the same name as onboarding-documents' — hence the
 * import alias here, matching the alias already used in app.module.ts), so
 * this module is safe to depend on all of them directly.
 */
@Module({
  imports: [
    EmployeesModule,
    RecruitmentAnalyticsModule,
    LearningAnalyticsModule,
    PerformanceAnalyticsModule,
    LeaveAnalyticsModule,
    EmployeeRelationsAnalyticsModule,
    OnboardingDocumentAssignmentsModule,
  ],
  controllers: [ExecutiveDashboardController],
  providers: [ExecutiveDashboardService, ExecutiveDashboardPdfService],
  exports: [ExecutiveDashboardService],
})
export class ExecutiveDashboardModule {}
