import { Module } from "@nestjs/common"

import { HrAnalyticsModule } from "../hr-analytics/hr-analytics.module"
import { EmployeeRelationsAnalyticsModule } from "../employee-relations/analytics/employee-relations-analytics.module"
import { EmployeeRelationsAccessModule } from "../employee-relations/access/employee-relations-access.module"
import { EmployeesModule } from "../employees/employees.module"
import { OrganizationModule } from "../organization/organization.module"
import { AssignmentsModule } from "../learning/assignments/assignments.module"
import { ReviewPeriodsModule } from "../performance/review-periods/review-periods.module"
import { ExitProcessModule } from "../employees/exit-process/exit-process.module"

import { AiAssistantController } from "./ai-assistant.controller"
import { AiAssistantOrchestratorService } from "./ai-assistant-orchestrator.service"
import { AiAuditLogService } from "./ai-audit-log.service"
import { AiConversationService } from "./ai-conversation.service"
import { AiPendingActionService } from "./ai-pending-action.service"
import { AnthropicClientService } from "./llm/anthropic-client.service"
import { AnalyticsToolsProvider } from "./tools/analytics.tools"
import { EmployeeToolsProvider } from "./tools/employee.tools"
import { ReportToolsProvider } from "./tools/report.tools"
import { ActionToolsProvider } from "./tools/action.tools"
import { ToolRegistryService } from "./tools/tool-registry.service"

/**
 * AI HR Administration Assistant — see the doc comment above `model
 * AiConversation` in schema.prisma for the overall architecture rationale
 * (tool-calling over existing services rather than RAG/vector search, and
 * why administrative actions are structurally two-phase).
 *
 * Scope decisions made building this module (disclosed once here):
 *   - LLM provider: Anthropic Claude via @anthropic-ai/sdk, gated behind
 *     ANTHROPIC_API_KEY (AnthropicClientService.isConfigured), same pattern
 *     as MailerService for SMTP. The spec allowed either OpenAI or Claude.
 *   - No pgvector/Pinecone: there is no HR policy-document corpus in this
 *     app to embed, and every example question in the spec maps directly
 *     onto an existing analytics/service method — tool-calling covers it.
 *   - No BullMQ/Redis: chat calls are synchronous (a few seconds), matching
 *     this app's established avoidance of a queue/worker layer elsewhere.
 *   - Predictive insights: explicitly out of scope (the spec itself labels
 *     this "(Future Enhancement)").
 *   - Chart types: the assistant surfaces bar/pie/donut/line/area charts
 *     built from tool output — bell curve, heatmap, treemap, org-chart, and
 *     funnel visualizations from the spec's full chart-type list were not
 *     built as generic renderers; the underlying data is still returned in
 *     the chat text/tables for those cases.
 *   - Administrative actions are a curated set of 5 (create department,
 *     create position, assign training, open a review cycle, initiate an
 *     exit) mapped onto existing service methods, not an open-ended action
 *     surface — and are gated to HR administrators only for this first
 *     pass (the spec's "manager/department head can request specific
 *     actions" is not yet modeled at that finer granularity).
 */
@Module({
  imports: [
    HrAnalyticsModule,
    EmployeeRelationsAnalyticsModule,
    EmployeeRelationsAccessModule,
    EmployeesModule,
    OrganizationModule,
    AssignmentsModule,
    ReviewPeriodsModule,
    ExitProcessModule,
  ],
  controllers: [AiAssistantController],
  providers: [
    AnthropicClientService,
    AiConversationService,
    AiAuditLogService,
    AiPendingActionService,
    AiAssistantOrchestratorService,
    AnalyticsToolsProvider,
    EmployeeToolsProvider,
    ReportToolsProvider,
    ActionToolsProvider,
    ToolRegistryService,
  ],
})
export class AiAssistantModule {}
