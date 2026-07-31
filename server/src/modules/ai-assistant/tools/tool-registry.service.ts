import { Injectable } from "@nestjs/common"
import type Anthropic from "@anthropic-ai/sdk"

import { AiAuditLogService } from "../ai-audit-log.service"

import { AnalyticsToolsProvider } from "./analytics.tools"
import { EmployeeToolsProvider } from "./employee.tools"
import { ReportToolsProvider } from "./report.tools"
import { ActionToolsProvider } from "./action.tools"
import type { AiToolDefinition, AiToolResult, ToolContext } from "./types"

function truncatedSummary(value: unknown): unknown {
  const json = JSON.stringify(value)
  if (!json) return null
  return json.length > 1500 ? `${json.slice(0, 1500)}… (truncated)` : (JSON.parse(json) as unknown)
}

/**
 * Composes every domain's tool provider into one registry, and is the sole
 * place tool calls get executed and audit-logged. `getToolsFor` is where
 * RBAC becomes structural rather than prompt-based: a non-admin actor's
 * tool list simply never contains the `propose_*` action tools, so the
 * model has no way to invoke them even if asked to.
 */
@Injectable()
export class ToolRegistryService {
  constructor(
    private readonly analyticsTools: AnalyticsToolsProvider,
    private readonly employeeTools: EmployeeToolsProvider,
    private readonly reportTools: ReportToolsProvider,
    private readonly actionTools: ActionToolsProvider,
    private readonly auditLog: AiAuditLogService
  ) {}

  getToolsFor(ctx: ToolContext, conversationId: string): AiToolDefinition[] {
    return [
      ...this.analyticsTools.getTools(),
      ...this.employeeTools.getTools(),
      ...this.reportTools.getTools(),
      ...(ctx.isAdmin ? this.actionTools.getTools(conversationId) : []),
    ]
  }

  toAnthropicTools(tools: AiToolDefinition[]): Anthropic.Tool[] {
    return tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.inputSchema as Anthropic.Tool.InputSchema }))
  }

  async execute(tools: AiToolDefinition[], name: string, input: Record<string, unknown>, ctx: ToolContext, conversationId: string): Promise<AiToolResult> {
    const tool = tools.find((t) => t.name === name)
    if (!tool) {
      void this.auditLog.log(ctx.actingEmployeeId, "ACCESS_DENIED", { tool: name, reason: "tool not available for this role" }, conversationId)
      return { forModel: { error: `The "${name}" tool is not available to you.` } }
    }

    try {
      const result = await tool.handler(input, ctx)
      void this.auditLog.log(ctx.actingEmployeeId, "TOOL_CALL", { tool: name, input, result: truncatedSummary(result.forModel) }, conversationId)
      if (result.reportLink) {
        void this.auditLog.log(ctx.actingEmployeeId, "REPORT_GENERATED", { tool: name, format: result.reportLink.format }, conversationId)
      }
      return result
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error."
      void this.auditLog.log(ctx.actingEmployeeId, "TOOL_CALL", { tool: name, input, error: message }, conversationId)
      return { forModel: { error: message } }
    }
  }
}
