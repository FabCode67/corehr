import { Injectable, Logger } from "@nestjs/common"

import { FormPriority, NotificationType } from "@prisma/client"

import { EmployeesService } from "../../employees/employees.service"
import { FormInstancesService } from "../../forms/instances/form-instances.service"
import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"

/** Must match the formCode seeded in prisma/seed.ts's "Template 4: Exit
 *  Clearance Form" — see that seed block's comment. */
const EXIT_FORM_CODE = "FORM-0004"

/**
 * Orchestrates "Automatic Exit Forms" (see the spec's Exit Management
 * section) by composing two already-existing, independently-working
 * pieces — EmployeesService.markExitInitiated() and Forms Management's
 * FormInstancesService.assign() — rather than either module reaching into
 * the other. Lives in its own module specifically so it can depend on both
 * EmployeesModule and FormInstancesModule without creating a circular
 * import (FormInstancesModule already depends on EmployeesModule for
 * reporting-manager resolution).
 */
@Injectable()
export class ExitProcessService {
  private readonly logger = new Logger(ExitProcessService.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly employeesService: EmployeesService,
    private readonly formInstancesService: FormInstancesService,
    private readonly emailService: EmailService
  ) {}

  private async safeSendEmail(params: Parameters<EmailService["enqueue"]>[0]) {
    try {
      await this.emailService.enqueue(params)
    } catch {
      // EmailService.enqueue() already logs internally.
    }
  }

  /**
   * Step 1 of Exit Management: mark the employee as having started exit
   * (non-terminal — processExit() is still the separate finalize step),
   * auto-assign the Exit Clearance Form (reusing Forms Management's
   * existing assignment pipeline, which already notifies the employee),
   * bulk-assign the Exit Document checklist (every active ExitDocumentType
   * — see schema.prisma's Exit Document Management module note), and
   * notify the line manager and HR. If the Exit Form template hasn't been
   * seeded yet, the exit is still marked as started — a missing form
   * template shouldn't block HR from beginning the process, it just means
   * there's nothing to track yet (logged as a warning). Unlike the Exit
   * Form (tracked but not enforced), the exit document checklist created
   * here IS enforced — EmployeesService.processExit() blocks finalization
   * until every assignment created below is marked complete.
   */
  async initiateExit(employeeId: string, actingEmployeeId: string) {
    const employee = await this.employeesService.markExitInitiated(employeeId, actingEmployeeId)

    const activeDocumentTypes = await this.prisma.exitDocumentType.findMany({ where: { isActive: true } })
    if (activeDocumentTypes.length > 0) {
      // Upsert with a reset-on-reassign update (not `update: {}`) — a
      // rehired-then-re-exited employee re-running this gets a fresh
      // checklist rather than one that reads as already-done from a prior
      // stint (see ExitDocumentAssignmentsService.bulkAssign's doc comment).
      await Promise.all(
        activeDocumentTypes.map((documentType) =>
          this.prisma.exitDocumentAssignment.upsert({
            where: { employeeId_documentTypeId: { employeeId, documentTypeId: documentType.id } },
            update: { isCompleted: false, completedAt: null, completedById: null, assignedById: actingEmployeeId, assignedAt: new Date() },
            create: { employeeId, documentTypeId: documentType.id, assignedById: actingEmployeeId },
          })
        )
      )
      await this.safeSendEmail({
        templateKey: "exit_clearance_checklist",
        recipientEmail: employee.email,
        recipientEmployeeId: employee.employeeNumber,
        relatedModule: "exit",
        relatedEntityId: employee.employeeNumber,
        variables: {
          employee_name: `${employee.firstName} ${employee.lastName}`,
          last_working_day: "To be confirmed by HR",
        },
      })
    } else {
      this.logger.warn(`Exit initiated for ${employeeId}, but no active exit document types exist — nothing assigned. Run the seed script or add some from Exit Document Types.`)
    }

    const template = await this.prisma.formTemplate.findUnique({ where: { formCode: EXIT_FORM_CODE } })

    let formInstance = null
    if (template && template.status === "ACTIVE") {
      formInstance = await this.formInstancesService.assign({
        formTemplateId: template.id,
        employeeId,
        assignedById: actingEmployeeId,
        priority: FormPriority.HIGH,
        instructions: "Please complete this Exit Clearance Form as part of your exit process.",
      })

      // The Exit Clearance Form *is* the clearance checklist in this
      // codebase (no separate checklist model) — one email covers both
      // exit_form_assigned and what the spec calls the clearance checklist.
      await this.safeSendEmail({
        templateKey: "exit_form_assigned",
        recipientEmail: employee.email,
        recipientEmployeeId: employee.employeeNumber,
        relatedModule: "exit",
        relatedEntityId: formInstance.id,
        variables: {
          employee_name: `${employee.firstName} ${employee.lastName}`,
          last_working_day: "To be confirmed by HR",
          form_url: buildClientUrl(`/staff/forms/${formInstance.id}`),
        },
      })
    } else {
      this.logger.warn(`Exit initiated for ${employeeId}, but no active "${EXIT_FORM_CODE}" form template was found — nothing assigned. Run the seed script to create it.`)
    }

    const employeeUrl = `/admin/employees/${employeeId}`

    const manager = await this.employeesService.getReportingManager(employeeId)
    if (manager.manager) {
      await this.prisma.notification.create({
        data: {
          recipientEmployeeId: manager.manager.id,
          type: NotificationType.EXIT_PROCESS_STARTED,
          title: "Exit process started",
          message: `${employee.firstName} ${employee.lastName}, who reports to you, has begun the exit process.`,
          relatedEmployeeId: employeeId,
          actionUrl: employeeUrl,
        },
      })
      const managerContact = await this.prisma.employee.findUnique({ where: { employeeNumber: manager.manager.id }, select: { email: true } })
      if (managerContact) {
        await this.safeSendEmail({
          templateKey: "exit_manager_approval_task",
          recipientEmail: managerContact.email,
          recipientEmployeeId: manager.manager.id,
          relatedModule: "exit",
          relatedEntityId: employeeId,
          variables: {
            manager_name: `${manager.manager.firstName} ${manager.manager.lastName}`,
            employee_name: `${employee.firstName} ${employee.lastName}`,
            task_name: "Exit clearance sign-off",
            employee_url: buildClientUrl(employeeUrl),
          },
        })
      }
    }

    const admins = await this.prisma.employee.findMany({ where: { isAdmin: true, isActive: true }, select: { employeeNumber: true, email: true } })
    if (admins.length > 0) {
      await this.prisma.notification.createMany({
        data: admins.map((admin) => ({
          recipientEmployeeId: admin.employeeNumber,
          type: NotificationType.EXIT_PROCESS_STARTED,
          title: "Exit process started",
          message: `${employee.firstName} ${employee.lastName} (${employee.employeeNumber}) has begun the exit process.`,
          relatedEmployeeId: employeeId,
          actionUrl: employeeUrl,
        })),
      })
      await Promise.all(
        admins.map((admin) =>
          this.safeSendEmail({
            templateKey: "exit_hr_workflow_update",
            recipientEmail: admin.email,
            recipientEmployeeId: admin.employeeNumber,
            relatedModule: "exit",
            relatedEntityId: employeeId,
            variables: {
              employee_name: `${employee.firstName} ${employee.lastName}`,
              status: "Exit process started",
              employee_url: buildClientUrl(employeeUrl),
            },
          })
        )
      )
    }

    return { employee, formInstance }
  }

  /** HR-facing tracker: where the auto-assigned Exit Form currently stands
   *  for this employee, so HR can see progress before finalizing exit
   *  clearance via the existing processExit() flow. Returns null if no
   *  Exit Form has ever been assigned (template missing, or exit not yet
   *  initiated). */
  async getExitFormStatus(employeeId: string) {
    const instance = await this.prisma.formInstance.findFirst({
      where: { employeeId, formTemplate: { formCode: EXIT_FORM_CODE } },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        status: true,
        assignmentDate: true,
        dueDate: true,
        submittedAt: true,
        completedAt: true,
        formTemplate: { select: { title: true } },
      },
    })
    return instance
  }
}
