import { Injectable } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import { AiPendingActionService } from "../ai-pending-action.service"

import type { AiToolDefinition, ToolContext } from "./types"
import { textResult } from "./types"

/**
 * Administrative-action tools — the ONLY tools in this whole module that can
 * lead to a data mutation, and even these can't mutate anything by
 * themselves: every handler below calls `pendingActionService.propose(...)`,
 * which just inserts an AiPendingAction row (status PENDING) and returns.
 * The actual DepartmentsService.create/PositionsService.create/etc. call
 * only happens from AiPendingActionService.confirmAndExecute(), fired by a
 * human clicking "Confirm" in the chat UI — see that file's doc comment.
 *
 * `requiresAdmin: true` on every tool here means these aren't even offered
 * to the model for a non-admin actor (see ToolRegistryService.getToolsFor) —
 * belt-and-braces on top of confirmAndExecute's own admin check.
 */
@Injectable()
export class ActionToolsProvider {
  constructor(
    private readonly prisma: PrismaService,
    private readonly pendingActions: AiPendingActionService
  ) {}

  private async findDepartment(identifier: string) {
    return this.prisma.department.findFirst({ where: { name: { contains: identifier, mode: "insensitive" } } })
  }

  private async findFunction(identifier: string) {
    return this.prisma.function.findFirst({ where: { name: { contains: identifier, mode: "insensitive" } } })
  }

  private async findLevel(identifier: string) {
    return this.prisma.positionLevel.findFirst({ where: { name: { contains: identifier, mode: "insensitive" } } })
  }

  private async findUnit(identifier: string, departmentId: string) {
    return this.prisma.unit.findFirst({ where: { departmentId, name: { contains: identifier, mode: "insensitive" } } })
  }

  private async findEmployee(identifier: string) {
    const byNumber = await this.prisma.employee.findUnique({ where: { employeeNumber: identifier } })
    if (byNumber) return byNumber
    return this.prisma.employee.findFirst({
      where: { OR: [{ firstName: { contains: identifier, mode: "insensitive" } }, { lastName: { contains: identifier, mode: "insensitive" } }] },
    })
  }

  private async findCourse(identifier: string) {
    return this.prisma.course.findFirst({ where: { OR: [{ courseCode: identifier }, { name: { contains: identifier, mode: "insensitive" } }] } })
  }

  getTools(conversationId: string): AiToolDefinition[] {
    return [
      {
        name: "propose_create_department",
        description: "Propose creating a new department. This does NOT create it immediately — it creates a pending action the user must confirm.",
        requiresAdmin: true,
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string", description: "Department name." },
            functionName: { type: "string", description: "The org function this department belongs to (e.g. 'Technology', 'Operations') — must match an existing function." },
            code: { type: "string", description: "Optional short department code." },
            description: { type: "string", description: "Optional description." },
          },
          required: ["name", "functionName"],
        },
        handler: async (input, ctx) => {
          const fn = await this.findFunction(String(input.functionName ?? ""))
          if (!fn) return textResult({ error: `No org function matching "${input.functionName}" was found. Use list_departments to check existing structure, or ask the user for the exact function name.` })

          const payload = { functionId: fn.id, name: String(input.name), code: input.code ? String(input.code) : undefined, description: input.description ? String(input.description) : undefined }
          const description = `Create department "${payload.name}" under function "${fn.name}".`
          const action = await this.pendingActions.propose(conversationId, ctx.actingEmployeeId, "CREATE_DEPARTMENT", description, payload)
          return { forModel: { status: "proposed", description }, pendingAction: { id: action.id, actionType: action.actionType, description: action.description } }
        },
      },
      {
        name: "propose_create_position",
        description: "Propose creating a new position within a department. This does NOT create it immediately — it creates a pending action the user must confirm.",
        requiresAdmin: true,
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Position title." },
            departmentName: { type: "string", description: "Department this position belongs to." },
            levelName: { type: "string", description: "Position level/grade name (e.g. 'Senior Manager')." },
            unitName: { type: "string", description: "Optional unit within the department." },
            reportsToTitle: { type: "string", description: "Optional: title of the position this one reports to." },
          },
          required: ["title", "departmentName", "levelName"],
        },
        handler: async (input, ctx) => {
          const department = await this.findDepartment(String(input.departmentName ?? ""))
          if (!department) return textResult({ error: `No department matching "${input.departmentName}" was found. Use list_departments to check the exact name.` })

          const level = await this.findLevel(String(input.levelName ?? ""))
          if (!level) return textResult({ error: `No position level matching "${input.levelName}" was found.` })

          let unitId: string | undefined
          if (typeof input.unitName === "string" && input.unitName.trim()) {
            const unit = await this.findUnit(input.unitName, department.id)
            if (!unit) return textResult({ error: `No unit matching "${input.unitName}" was found in ${department.name}.` })
            unitId = unit.id
          }

          let reportsToPositionId: string | undefined
          if (typeof input.reportsToTitle === "string" && input.reportsToTitle.trim()) {
            const reportsTo = await this.prisma.position.findFirst({ where: { title: { contains: input.reportsToTitle, mode: "insensitive" } } })
            if (!reportsTo) return textResult({ error: `No position matching "${input.reportsToTitle}" was found to report to.` })
            reportsToPositionId = reportsTo.id
          }

          const payload = { title: String(input.title), departmentId: department.id, levelId: level.id, unitId, reportsToPositionId }
          const description = `Create position "${payload.title}" (${level.name}) in ${department.name}${unitId ? ` / ${input.unitName}` : ""}.`
          const action = await this.pendingActions.propose(conversationId, ctx.actingEmployeeId, "CREATE_POSITION", description, payload)
          return { forModel: { status: "proposed", description }, pendingAction: { id: action.id, actionType: action.actionType, description: action.description } }
        },
      },
      {
        name: "propose_assign_training",
        description: "Propose assigning a training course to an employee. This does NOT assign it immediately — it creates a pending action the user must confirm.",
        requiresAdmin: true,
        inputSchema: {
          type: "object",
          properties: {
            employeeIdentifier: { type: "string", description: "Employee number or name." },
            courseIdentifier: { type: "string", description: "Course code or name." },
            dueDate: { type: "string", description: "Optional due date, ISO format (YYYY-MM-DD)." },
            reason: { type: "string", description: "Optional reason for the assignment." },
          },
          required: ["employeeIdentifier", "courseIdentifier"],
        },
        handler: async (input, ctx) => {
          const employee = await this.findEmployee(String(input.employeeIdentifier ?? ""))
          if (!employee) return textResult({ error: `No employee matching "${input.employeeIdentifier}" was found. Try search_employees first.` })

          const course = await this.findCourse(String(input.courseIdentifier ?? ""))
          if (!course) return textResult({ error: `No course matching "${input.courseIdentifier}" was found.` })

          const payload = {
            employeeId: employee.employeeNumber,
            courseId: course.id,
            dueDate: typeof input.dueDate === "string" ? input.dueDate : undefined,
            reasonForAssignment: typeof input.reason === "string" ? input.reason : undefined,
          }
          const description = `Assign course "${course.name}" to ${employee.firstName} ${employee.lastName} (${employee.employeeNumber}).`
          const action = await this.pendingActions.propose(conversationId, ctx.actingEmployeeId, "ASSIGN_TRAINING", description, payload)
          return { forModel: { status: "proposed", description }, pendingAction: { id: action.id, actionType: action.actionType, description: action.description } }
        },
      },
      {
        name: "propose_open_review_cycle",
        description:
          "Propose opening a performance review cycle (Mid-Year or Annual) for a review period, e.g. 'FY2026'. If the named period doesn't exist yet, it will be created as part of this action. This does NOT open it immediately — it creates a pending action the user must confirm.",
        requiresAdmin: true,
        inputSchema: {
          type: "object",
          properties: {
            periodName: { type: "string", description: "Review period name, e.g. 'FY2026'." },
            year: { type: "number", description: "Calendar year for the period." },
            cycle: { type: "string", enum: ["MID_YEAR", "ANNUAL"], description: "Which cycle to open." },
          },
          required: ["periodName", "year", "cycle"],
        },
        handler: async (input, ctx) => {
          const cycle = String(input.cycle ?? "")
          if (cycle !== "MID_YEAR" && cycle !== "ANNUAL") return textResult({ error: `cycle must be MID_YEAR or ANNUAL.` })

          const existing = await this.prisma.performanceReviewPeriod.findFirst({ where: { name: String(input.periodName), year: Number(input.year) } })
          const payload = { periodName: String(input.periodName), year: Number(input.year), cycle, reviewPeriodId: existing?.id }
          const description = `Open the ${cycle === "MID_YEAR" ? "Mid-Year" : "Annual"} review cycle for "${input.periodName}" (${input.year})${existing ? "" : " — this review period will be created first"}.`
          const action = await this.pendingActions.propose(conversationId, ctx.actingEmployeeId, "OPEN_REVIEW_CYCLE", description, payload)
          return { forModel: { status: "proposed", description }, pendingAction: { id: action.id, actionType: action.actionType, description: action.description } }
        },
      },
      {
        name: "propose_initiate_exit",
        description: "Propose initiating the exit process for an employee (assigns the Exit Clearance Form and notifies employee/manager/HR). This does NOT initiate it immediately — it creates a pending action the user must confirm.",
        requiresAdmin: true,
        inputSchema: {
          type: "object",
          properties: { employeeIdentifier: { type: "string", description: "Employee number or name." } },
          required: ["employeeIdentifier"],
        },
        handler: async (input, ctx) => {
          const employee = await this.findEmployee(String(input.employeeIdentifier ?? ""))
          if (!employee) return textResult({ error: `No employee matching "${input.employeeIdentifier}" was found. Try search_employees first.` })

          const payload = { employeeId: employee.employeeNumber }
          const description = `Initiate the exit process for ${employee.firstName} ${employee.lastName} (${employee.employeeNumber}).`
          const action = await this.pendingActions.propose(conversationId, ctx.actingEmployeeId, "INITIATE_EXIT", description, payload)
          return { forModel: { status: "proposed", description }, pendingAction: { id: action.id, actionType: action.actionType, description: action.description } }
        },
      },
    ]
  }
}
