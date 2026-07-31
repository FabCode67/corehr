/**
 * Shared shapes for the AI Assistant's tool-calling layer. Every tool wraps
 * an *existing* service method (analytics service, EmployeesService,
 * DepartmentsService, ...) — see the module-level comment in
 * schema.prisma above `model AiConversation` for why this design (rather
 * than SQL/RAG) satisfies the spec's "LLM never touches the database
 * directly" requirement.
 */

export interface ToolContext {
  /** The Employee.employeeNumber of the person chatting with the assistant. */
  actingEmployeeId: string
  isAdmin: boolean
}

export type ChartType = "bar" | "pie" | "donut" | "line" | "area"

export interface ChartArtifact {
  type: ChartType
  title: string
  /** Generic {name, value} rows — the client's chart renderer maps these
   *  directly onto Recharts, matching the shape already used by the HR
   *  Analytics dashboard's chart components. */
  data: Array<Record<string, string | number>>
  dataKey?: string
  nameKey?: string
}

export interface TableArtifact {
  title: string
  columns: string[]
  rows: Array<Array<string | number>>
}

export interface ReportLinkArtifact {
  title: string
  format: "xlsx" | "csv" | "pdf" | "pptx"
  url: string
}

export interface PendingActionArtifact {
  id: string
  actionType: string
  description: string
}

/** What a tool handler returns: `forModel` is serialized back to Claude as
 *  the tool_result so it can reason over the numbers in prose; the
 *  artifact fields (if present) are lifted out by the orchestrator and
 *  attached to the persisted AiMessage for the client to render directly,
 *  bypassing any risk of the model mangling chart data while narrating it. */
export interface AiToolResult {
  forModel: unknown
  chart?: ChartArtifact
  table?: TableArtifact
  reportLink?: ReportLinkArtifact
  pendingAction?: PendingActionArtifact
}

export interface AiToolDefinition {
  name: string
  description: string
  inputSchema: {
    type: "object"
    properties: Record<string, unknown>
    required?: string[]
  }
  /** Mutating/administrative tools — hidden entirely from non-admin actors
   *  rather than merely instructed against, so a non-admin conversation
   *  never even has these in its tool list. */
  requiresAdmin?: boolean
  handler: (input: Record<string, unknown>, ctx: ToolContext) => Promise<AiToolResult>
}

export function textResult(forModel: unknown): AiToolResult {
  return { forModel }
}
