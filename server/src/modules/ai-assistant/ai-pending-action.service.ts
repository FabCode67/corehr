import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"
import type { Prisma } from "@prisma/client"

import { PrismaService } from "../../prisma/prisma.service"
import { DepartmentsService } from "../organization/departments/departments.service"
import { PositionsService } from "../organization/positions/positions.service"
import { AssignmentsService } from "../learning/assignments/assignments.service"
import { ReviewPeriodsService } from "../performance/review-periods/review-periods.service"
import { ExitProcessService } from "../employees/exit-process/exit-process.service"

import { AiAuditLogService } from "./ai-audit-log.service"

/**
 * Executes (or rejects) an AiPendingAction proposed by the assistant.
 *
 * This is where "every action that modifies data must require explicit
 * confirmation from the user before execution" actually becomes true: the
 * LLM's `propose_*` tools (see tools/action.tools.ts) can only reach
 * `propose()`, which writes a PENDING row and nothing else. Every branch in
 * `confirmAndExecute()` below is the FIRST and ONLY place any of the
 * underlying mutating services (DepartmentsService.create, etc.) gets
 * called from this module — and it only runs when a human hits the Confirm
 * button, which calls this method directly from the controller, never from
 * inside the chat/tool-calling loop.
 */
@Injectable()
export class AiPendingActionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AiAuditLogService,
    private readonly departmentsService: DepartmentsService,
    private readonly positionsService: PositionsService,
    private readonly assignmentsService: AssignmentsService,
    private readonly reviewPeriodsService: ReviewPeriodsService,
    private readonly exitProcessService: ExitProcessService
  ) {}

  async propose(conversationId: string, requestedByEmployeeId: string, actionType: string, description: string, payload: Record<string, unknown>) {
    const action = await this.prisma.aiPendingAction.create({
      data: { conversationId, requestedByEmployeeId, actionType, description, payload: payload as Prisma.InputJsonValue },
    })
    void this.auditLog.log(requestedByEmployeeId, "ACTION_PROPOSED", { actionId: action.id, actionType, description }, conversationId)
    return action
  }

  async listForConversation(conversationId: string) {
    return this.prisma.aiPendingAction.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } })
  }

  async reject(id: string, rejectingEmployeeId: string) {
    const action = await this.prisma.aiPendingAction.findUnique({ where: { id } })
    if (!action) throw new NotFoundException("Pending action not found.")
    if (action.status !== "PENDING") throw new BadRequestException("This action is no longer pending.")

    const updated = await this.prisma.aiPendingAction.update({
      where: { id },
      data: { status: "REJECTED", confirmedByEmployeeId: rejectingEmployeeId },
    })
    void this.auditLog.log(rejectingEmployeeId, "ACTION_REJECTED", { actionId: id, actionType: action.actionType }, action.conversationId)
    return updated
  }

  async confirmAndExecute(id: string, confirmingEmployeeId: string) {
    const action = await this.prisma.aiPendingAction.findUnique({ where: { id } })
    if (!action) throw new NotFoundException("Pending action not found.")
    if (action.status !== "PENDING") throw new BadRequestException("This action is no longer pending.")

    const actor = await this.prisma.employee.findUnique({ where: { employeeNumber: confirmingEmployeeId }, select: { isAdmin: true } })
    if (!actor?.isAdmin) {
      void this.auditLog.log(confirmingEmployeeId, "ACCESS_DENIED", { actionId: id, reason: "not an admin" }, action.conversationId)
      throw new ForbiddenException("Only an HR administrator can confirm this action.")
    }

    await this.prisma.aiPendingAction.update({ where: { id }, data: { status: "CONFIRMED", confirmedByEmployeeId: confirmingEmployeeId } })
    void this.auditLog.log(confirmingEmployeeId, "ACTION_CONFIRMED", { actionId: id, actionType: action.actionType }, action.conversationId)

    try {
      const resultSummary = await this.execute(action.actionType, action.payload as Record<string, unknown>, confirmingEmployeeId)
      const updated = await this.prisma.aiPendingAction.update({ where: { id }, data: { status: "EXECUTED", resultSummary } })
      void this.auditLog.log(confirmingEmployeeId, "ACTION_EXECUTED", { actionId: id, actionType: action.actionType, resultSummary }, action.conversationId)
      return updated
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error."
      const updated = await this.prisma.aiPendingAction.update({ where: { id }, data: { status: "FAILED", resultSummary: message } })
      void this.auditLog.log(confirmingEmployeeId, "ACTION_FAILED", { actionId: id, actionType: action.actionType, message }, action.conversationId)
      return updated
    }
  }

  /** Dispatch table — one branch per actionType proposed in tools/action.tools.ts. */
  private async execute(actionType: string, payload: Record<string, unknown>, confirmingEmployeeId: string): Promise<string> {
    switch (actionType) {
      case "CREATE_DEPARTMENT": {
        const dept = await this.departmentsService.create({
          functionId: String(payload.functionId),
          name: String(payload.name),
          code: payload.code ? String(payload.code) : undefined,
          description: payload.description ? String(payload.description) : undefined,
        })
        return `Department "${dept.name}" created.`
      }
      case "CREATE_POSITION": {
        const position = await this.positionsService.create({
          title: String(payload.title),
          departmentId: String(payload.departmentId),
          levelId: String(payload.levelId),
          unitId: payload.unitId ? String(payload.unitId) : undefined,
          reportsToPositionId: payload.reportsToPositionId ? String(payload.reportsToPositionId) : undefined,
        })
        return `Position "${position.title}" created.`
      }
      case "ASSIGN_TRAINING": {
        await this.assignmentsService.create({
          employeeId: String(payload.employeeId),
          courseId: String(payload.courseId),
          actingEmployeeId: confirmingEmployeeId,
          dueDate: payload.dueDate ? new Date(String(payload.dueDate)) : undefined,
          reasonForAssignment: payload.reasonForAssignment ? String(payload.reasonForAssignment) : undefined,
        })
        return "Training assigned."
      }
      case "OPEN_REVIEW_CYCLE": {
        let reviewPeriodId = payload.reviewPeriodId ? String(payload.reviewPeriodId) : undefined
        if (!reviewPeriodId) {
          const period = await this.reviewPeriodsService.create({ name: String(payload.periodName), year: Number(payload.year) })
          reviewPeriodId = period.id
        }
        const cycle = String(payload.cycle) as "MID_YEAR" | "ANNUAL"
        await this.reviewPeriodsService.openCycle(reviewPeriodId, cycle)
        return `${cycle === "MID_YEAR" ? "Mid-Year" : "Annual"} review cycle opened for "${payload.periodName}".`
      }
      case "INITIATE_EXIT": {
        await this.exitProcessService.initiateExit(String(payload.employeeId), confirmingEmployeeId)
        return "Exit process initiated."
      }
      default:
        throw new Error(`Unknown action type: ${actionType}`)
    }
  }
}
