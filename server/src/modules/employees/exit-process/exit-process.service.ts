import { Injectable, Logger } from "@nestjs/common"

import { FormPriority, NotificationType } from "@prisma/client"

import { EmployeesService } from "../../employees/employees.service"
import { FormInstancesService } from "../../forms/instances/form-instances.service"
import { buildClientUrl } from "../../../common/client-url.util"
import { PrismaService } from "../../../prisma/prisma.service"
import { EmailService } from "../../email/email.service"
import { ExitClearanceService } from "../../exit-clearance/assignments/exit-clearance.service"

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
    private readonly emailService: EmailService,
    private readonly exitClearanceService: ExitClearanceService
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
   * bulk-assign the configurable Exit Clearance Workflow forms (every
   * active ExitClearanceFormTemplate, routed to its responsible
   * department/position — see schema.prisma's "EXIT CLEARANCE WORKFLOW"
   * module note and ExitClearanceService.bulkAssignForExit()), and notify
   * the line manager and HR. If the Exit Form template hasn't been seeded
   * yet, the exit is still marked as started — a missing form template
   * shouldn't block HR from beginning the process, it just means there's
   * nothing to track yet (logged as a warning). Unlike the Exit Form
   * (tracked but not enforced), the clearance forms bulk-assigned here ARE
   * enforced — EmployeesService.processExit() blocks finalization until
   * every MANDATORY assignment is COMPLETED.
   */
  async initiateExit(employeeId: string, actingEmployeeId: string) {
    const employee = await this.employeesService.markExitInitiated(employeeId, actingEmployeeId)

    await this.exitClearanceService.bulkAssignForExit(employeeId, actingEmployeeId)

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

      // This Forms Management "Exit Clearance Form" is a separate,
      // free-text form (tracked but not enforced) from the configurable
      // Exit Clearance Workflow forms bulk-assigned above — two different
      // things that happen to share a name; see EXIT_FORM_CODE's comment.
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
      // Deliberately NOT routed through NotificationsService.create() here —
      // that method's HR-admin fan-out (see its doc comment) would duplicate
      // the dedicated, properly-worded admin broadcast this method already
      // sends unconditionally a few lines below, giving every admin two
      // differently-worded notifications for the same exit instead of one.
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
