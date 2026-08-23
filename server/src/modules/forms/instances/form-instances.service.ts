import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common"

import { FormInstanceStatus, Prisma, SignerRole } from "@prisma/client"

import { EmployeesService } from "../../employees/employees.service"
import { FormsAccessService } from "../access/forms-access.service"
import { PrismaService } from "../../../prisma/prisma.service"

import { AssignFormDto } from "./dto/assign-form.dto"
import { ChooseSignatoryDto } from "./dto/choose-signatory.dto"
import { SaveResponsesDto } from "./dto/save-responses.dto"

const FORM_INSTANCE_INCLUDE = {
  formTemplate: {
    include: {
      category: true,
      fields: { orderBy: { order: "asc" as const } },
      signatureStages: { orderBy: { stageOrder: "asc" as const } },
    },
  },
  employee: { select: { employeeNumber: true, firstName: true, lastName: true } },
  assignedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
  responses: true,
  signatures: {
    include: {
      formSignatureStage: true,
      signer: { select: { employeeNumber: true, firstName: true, lastName: true } },
    },
    orderBy: { formSignatureStage: { stageOrder: "asc" as const } },
  },
} as const

export interface FormInstanceFilters {
  employeeId?: string
  status?: string
}

@Injectable()
export class FormInstancesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly accessService: FormsAccessService,
    private readonly employeesService: EmployeesService
  ) {}

  async findAll(filters: FormInstanceFilters, actingEmployeeId: string) {
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const where: Prisma.FormInstanceWhereInput = {
      ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      ...(filters.status ? { status: filters.status as FormInstanceStatus } : {}),
    }
    return this.prisma.formInstance.findMany({
      where: scope.allowAll ? where : { AND: [this.accessService.buildInstanceWhere(scope), where] },
      include: FORM_INSTANCE_INCLUDE,
      orderBy: { createdAt: "desc" },
    })
  }

  /** Signatures pending on the acting employee specifically — the "Pending
   *  Signatures" section. */
  async findPendingSignatures(actingEmployeeId: string) {
    return this.prisma.formInstance.findMany({
      where: { signatures: { some: { signerId: actingEmployeeId, status: "PENDING" } } },
      include: FORM_INSTANCE_INCLUDE,
      orderBy: { createdAt: "desc" },
    })
  }

  async findOne(id: string, actingEmployeeId: string) {
    const instance = await this.prisma.formInstance.findUnique({ where: { id }, include: FORM_INSTANCE_INCLUDE })
    if (!instance) {
      throw new NotFoundException(`Form instance ${id} not found`)
    }
    const scope = await this.accessService.resolveScope(actingEmployeeId)
    const isSigner = instance.signatures.some((signature) => signature.signerId === actingEmployeeId)
    if (!this.accessService.canAccessInstance(scope, instance, isSigner)) {
      throw new ForbiddenException("You don't have access to this form")
    }
    return instance
  }

  /** Creates the instance and seeds one FormSignature row per template
   *  signature stage, auto-resolving MANAGER/HEAD_OF_DEPARTMENT/EMPLOYEE
   *  signers from the org chart — see schema's module doc comment. */
  async assign(dto: AssignFormDto) {
    const template = await this.prisma.formTemplate.findUnique({
      where: { id: dto.formTemplateId },
      include: { signatureStages: true },
    })
    if (!template) {
      throw new NotFoundException(`Form template ${dto.formTemplateId} not found`)
    }
    if (template.status !== "ACTIVE") {
      throw new BadRequestException("Only an active (published) template can be assigned.")
    }

    const employee = await this.prisma.employee.findUnique({ where: { employeeNumber: dto.employeeId }, include: { position: true } })
    if (!employee) {
      throw new NotFoundException(`Employee ${dto.employeeId} not found`)
    }

    const resolvedSigners = await Promise.all(
      template.signatureStages.map(async (stage) => ({
        stage,
        signerId: await this.resolveSigner(stage.role, stage.specificApproverId, dto.employeeId, employee.position?.departmentId ?? null),
      }))
    )

    const instance = await this.prisma.formInstance.create({
      data: {
        formTemplateId: template.id,
        formVersion: template.version,
        employeeId: dto.employeeId,
        assignedById: dto.assignedById,
        dueDate: dto.dueDate,
        instructions: dto.instructions,
        priority: dto.priority,
        signatures: {
          create: resolvedSigners.map(({ stage, signerId }) => ({ formSignatureStageId: stage.id, signerId })),
        },
      },
      include: FORM_INSTANCE_INCLUDE,
    })

    await this.notify(dto.employeeId, "FORM_ASSIGNED", "Form assigned", `You've been assigned "${template.title}".`, instance.id)
    await this.log(instance.id, "ASSIGNED", dto.assignedById)
    return instance
  }

  async saveDraftResponses(id: string, dto: SaveResponsesDto) {
    const instance = await this.findOne(id, dto.actingEmployeeId)
    if (instance.employeeId !== dto.actingEmployeeId) {
      throw new ForbiddenException("Only the assigned employee can fill in this form.")
    }
    if (instance.status !== "ASSIGNED" && instance.status !== "IN_PROGRESS" && instance.status !== "DRAFT") {
      throw new BadRequestException("This form has already been submitted and can no longer be edited.")
    }

    await this.prisma.$transaction(
      dto.responses.map((response) => {
        const value = (response.value ?? Prisma.JsonNull) as Prisma.InputJsonValue
        return this.prisma.formFieldResponse.upsert({
          where: { formInstanceId_formFieldId: { formInstanceId: id, formFieldId: response.formFieldId } },
          update: { value },
          create: { formInstanceId: id, formFieldId: response.formFieldId, value },
        })
      })
    )

    if (instance.status === "ASSIGNED") {
      await this.prisma.formInstance.update({ where: { id }, data: { status: "IN_PROGRESS" } })
    }

    return this.findOne(id, dto.actingEmployeeId)
  }

  async chooseSignatory(instanceId: string, signatureId: string, dto: ChooseSignatoryDto) {
    const instance = await this.findOne(instanceId, dto.actingEmployeeId)
    const signature = instance.signatures.find((item) => item.id === signatureId)
    if (!signature) {
      throw new NotFoundException(`Signature ${signatureId} not found on this form`)
    }
    if (signature.status !== "PENDING") {
      throw new BadRequestException("This signature has already been actioned and can't be reassigned.")
    }

    const updated = await this.prisma.formSignature.update({ where: { id: signatureId }, data: { signerId: dto.signerId } })
    await this.log(instanceId, "SIGNATORY_CHOSEN", dto.actingEmployeeId, `Stage ${signature.formSignatureStageId} -> ${dto.signerId}`)
    return updated
  }

  /** Validates required fields/attachments/signatories are all in place,
   *  then moves the instance to PENDING_SIGNATURES (or straight to
   *  COMPLETED if the template has no signature stages at all) and
   *  notifies the first stage's signer(s). */
  async submit(id: string, actingEmployeeId: string) {
    const instance = await this.findOne(id, actingEmployeeId)
    if (instance.employeeId !== actingEmployeeId) {
      throw new ForbiddenException("Only the assigned employee can submit this form.")
    }
    if (instance.status !== "ASSIGNED" && instance.status !== "IN_PROGRESS" && instance.status !== "DRAFT") {
      throw new BadRequestException("This form has already been submitted.")
    }

    const responseByFieldId = new Map(instance.responses.map((response) => [response.formFieldId, response.value]))
    const missingFields = instance.formTemplate.fields.filter((field) => {
      if (!field.isRequired) return false
      const value = responseByFieldId.get(field.id)
      return value === undefined || value === null || value === ""
    })
    if (missingFields.length > 0) {
      throw new BadRequestException(`Please complete required field(s): ${missingFields.map((field) => field.label).join(", ")}`)
    }

    const unresolvedSignatories = instance.signatures.filter((signature) => !signature.signerId)
    if (unresolvedSignatories.length > 0) {
      throw new BadRequestException("Please select a signatory for every required signature before submitting.")
    }

    // A resubmission after a "returned for correction" signature clears
    // that signature back to PENDING so it becomes actionable again.
    await this.prisma.formSignature.updateMany({
      where: { formInstanceId: id, status: "RETURNED_FOR_CORRECTION" },
      data: { status: "PENDING", comments: null },
    })

    const hasStages = instance.formTemplate.signatureStages.length > 0
    const updated = await this.prisma.formInstance.update({
      where: { id },
      data: {
        status: hasStages ? "PENDING_SIGNATURES" : "COMPLETED",
        submittedAt: new Date(),
        completedAt: hasStages ? null : new Date(),
      },
      include: FORM_INSTANCE_INCLUDE,
    })

    await this.log(id, "SUBMITTED", actingEmployeeId)

    if (hasStages) {
      // Notify signers at the lowest stageOrder that still has a pending
      // signature — the first stage on a fresh submission, or the returned
      // stage (earlier ones remain SIGNED) on a resubmission.
      const pendingSignatures = updated.signatures.filter((signature) => signature.status === "PENDING")
      if (pendingSignatures.length > 0) {
        const activeStageOrder = Math.min(...pendingSignatures.map((signature) => signature.formSignatureStage.stageOrder))
        for (const signature of pendingSignatures.filter((item) => item.formSignatureStage.stageOrder === activeStageOrder)) {
          if (signature.signerId) {
            await this.notify(signature.signerId, "FORM_SIGNATURE_REQUIRED", "Signature required", `"${instance.formTemplate.title}" needs your signature.`, id)
          }
        }
      }
    } else {
      await this.notify(instance.employeeId, "FORM_COMPLETED", "Form completed", `"${instance.formTemplate.title}" is complete.`, id)
    }

    return updated
  }

  /** Audit trail for one instance — the "Form Audit History" view. Access
   *  is gated the same way as findOne() since the log can reveal who did
   *  what and when. */
  async getAuditLog(id: string, actingEmployeeId: string) {
    await this.findOne(id, actingEmployeeId) // throws NotFound/Forbidden as appropriate
    return this.prisma.formAuditLog.findMany({
      where: { entityType: "FormInstance", entityId: id },
      include: { actor: { select: { employeeNumber: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: "asc" },
    })
  }

  async archive(id: string, actingEmployeeId: string) {
    const instance = await this.findOne(id, actingEmployeeId)
    if (instance.status !== "COMPLETED" && instance.status !== "REJECTED") {
      throw new BadRequestException("Only a completed or rejected form can be archived.")
    }
    const updated = await this.prisma.formInstance.update({ where: { id }, data: { status: "ARCHIVED" }, include: FORM_INSTANCE_INCLUDE })
    await this.log(id, "ARCHIVED", actingEmployeeId)
    return updated
  }

  /** Best-effort org-chart derivation — not authoritative HR policy, see
   *  schema's module doc comment. */
  private async resolveSigner(
    role: SignerRole,
    specificApproverId: string | null,
    employeeId: string,
    departmentId: string | null
  ): Promise<string | null> {
    if (specificApproverId) return specificApproverId

    if (role === "EMPLOYEE") return employeeId

    if (role === "MANAGER") {
      const result = await this.employeesService.getReportingManager(employeeId)
      return result.manager?.id ?? null
    }

    if (role === "HEAD_OF_DEPARTMENT") {
      return this.resolveHeadOfDepartment(departmentId)
    }

    // HR / EXECUTIVE_MANAGEMENT / unassigned SPECIFIC_APPROVER — left for the
    // employee (or HR) to choose before submission.
    return null
  }

  private async resolveHeadOfDepartment(departmentId: string | null): Promise<string | null> {
    if (!departmentId) return null

    const positions = await this.prisma.position.findMany({ where: { departmentId, isActive: true } })
    for (const position of positions) {
      if (!position.reportsToPositionId) {
        const holder = await this.prisma.employee.findFirst({ where: { positionId: position.id, isActive: true } })
        if (holder) return holder.employeeNumber
        continue
      }
      const parent = await this.prisma.position.findUnique({ where: { id: position.reportsToPositionId } })
      if (!parent || parent.departmentId !== departmentId) {
        const holder = await this.prisma.employee.findFirst({ where: { positionId: position.id, isActive: true } })
        if (holder) return holder.employeeNumber
      }
    }
    return null
  }

  private async notify(
    recipientEmployeeId: string,
    type: "FORM_ASSIGNED" | "FORM_SIGNATURE_REQUIRED" | "FORM_COMPLETED" | "FORM_APPROVED" | "FORM_REJECTED",
    title: string,
    message: string,
    formInstanceId: string
  ) {
    await this.prisma.notification.create({
      data: { recipientEmployeeId, type, title, message, actionUrl: `/staff/forms/${formInstanceId}` },
    })
  }

  private async log(id: string, action: string, actorId: string | null, notes?: string) {
    await this.prisma.formAuditLog.create({ data: { entityType: "FormInstance", entityId: id, action, actorId, notes: notes || null } })
  }
}
