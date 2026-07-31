import { Module } from "@nestjs/common"

import { LeaveAnalyticsModule } from "../leave/leave-analytics/leave-analytics.module"
import { PerformanceAnalyticsModule } from "../performance/analytics/analytics.module"
import { RecruitmentAnalyticsModule } from "../recruitment/analytics/analytics.module"
import { LearningAnalyticsModule } from "../learning/analytics/analytics.module"

import { HrAnalyticsAccessService } from "./access/hr-analytics-access.service"
import { HrAnalyticsAccessLogService } from "./hr-analytics-access-log.service"
import { HrAnalyticsDelegatedService } from "./hr-analytics-delegated.service"
import { HrAnalyticsExportController } from "./hr-analytics-export.controller"
import { HrAnalyticsExportService } from "./hr-analytics-export.service"
import { HrAnalyticsSavedViewsService } from "./hr-analytics-saved-views.service"
import { HrAnalyticsController } from "./hr-analytics.controller"
import { HrAnalyticsService } from "./hr-analytics.service"

/**
 * HR Dashboard & Analytics Module — see the schema.prisma section comment
 * above HrAnalyticsSavedView/HrAnalyticsAccessLog for why this is a new,
 * standalone module rather than an extension of ExecutiveDashboardModule.
 *
 * Scope decisions made building this (disclosed once here rather than
 * scattered across every file):
 *   - Real-time refresh: implemented as a client-side manual refetch (same
 *     "no websocket/push infrastructure in this app" pattern as every other
 *     dashboard here), not a live push feed.
 *   - AI-Powered HR Insights: explicitly a "Future Enhancement" in the spec
 *     — not built. The PDF/PPTX exports' "Key HR Insights" section instead
 *     uses simple rule-based summary lines computed from the same numbers
 *     already on the dashboard (see HrAnalyticsExportService.buildInsights)
 *     — useful, but not AI-generated, and shouldn't be mistaken for it.
 *   - "Employees: Personal analytics only": this module is the HR-facing,
 *     org-wide/manager-scoped dashboard (admin portal). A separate, much
 *     smaller personal-analytics view for the staff portal was not built in
 *     this pass — worth a follow-up if needed.
 *   - Calendar heatmap (Leave Summary): implemented as a month x leave-type
 *     grid rather than a true day-by-day calendar — see
 *     HrAnalyticsDelegatedService.leaveHeatmap()'s doc comment.
 *   - Recruitment section: the existing RecruitmentAnalyticsService only
 *     takes actingEmployeeId (its own built-in role scope, no filter
 *     passthrough) — this dashboard's org-dimension filters don't narrow
 *     that section. See HrAnalyticsDelegatedService's class doc comment.
 *   - Drill-down: chart segments link to the existing employee list with
 *     matching query-string filters pre-applied, rather than an embedded
 *     modal browser.
 */
@Module({
  imports: [LeaveAnalyticsModule, PerformanceAnalyticsModule, RecruitmentAnalyticsModule, LearningAnalyticsModule],
  controllers: [HrAnalyticsController, HrAnalyticsExportController],
  providers: [HrAnalyticsService, HrAnalyticsDelegatedService, HrAnalyticsAccessService, HrAnalyticsSavedViewsService, HrAnalyticsAccessLogService, HrAnalyticsExportService],
  // Exported so the AI HR Administration Assistant (server/src/modules/ai-assistant)
  // can wrap these same services as tool-calling targets rather than re-implementing
  // any analytics queries — see that module's own doc comment.
  exports: [HrAnalyticsService, HrAnalyticsDelegatedService, HrAnalyticsAccessService],
})
export class HrAnalyticsModule {}
