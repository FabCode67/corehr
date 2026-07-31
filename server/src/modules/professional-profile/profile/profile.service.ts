import { Injectable, NotFoundException } from "@nestjs/common"
import type { EmployeeCertification } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"
import { UpdateProfileSummaryDto } from "./dto/update-profile-summary.dto"

function withCertStatus<T extends EmployeeCertification>(cert: T) {
  const status = cert.expiryDate && cert.expiryDate < new Date() ? ("EXPIRED" as const) : ("ACTIVE" as const)
  return { ...cert, status }
}

@Injectable()
export class ProfileService {
  constructor(private readonly prisma: PrismaService) {}

  async updateSummary(employeeId: string, dto: UpdateProfileSummaryDto) {
    const employee = await this.prisma.employee.findUnique({ where: { employeeNumber: employeeId } })
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`)

    return this.prisma.employee.update({
      where: { employeeNumber: employeeId },
      data: dto,
      select: { employeeNumber: true, professionalSummary: true, careerInterests: true },
    })
  }

  /**
   * The single LinkedIn-style aggregate view: About + Experience + Education
   * + Certifications + Skills. `viewerEmployeeId` drives visibility — per
   * spec, "Managers can view approved employee profiles based on
   * permissions": this app has no granular permission system, so the rule
   * implemented is the simplest faithful reading — the profile owner and
   * any HR admin see every record including PENDING_REVIEW/REJECTED (with
   * their status badge, so they know what's still being checked); anyone
   * else (a manager, a colleague) only ever sees VERIFIED education/
   * certification records. Work experience and skills are pure self-report
   * with no verification concept (see EmployeeWorkExperience's doc
   * comment), so they're visible to any viewer regardless.
   */
  async getFullProfile(employeeId: string, viewerEmployeeId?: string) {
    const employee = await this.prisma.employee.findUnique({
      where: { employeeNumber: employeeId },
      select: {
        employeeNumber: true,
        firstName: true,
        lastName: true,
        profilePictureUrl: true,
        professionalSummary: true,
        careerInterests: true,
        position: { select: { title: true, department: { select: { name: true } } } },
      },
    })
    if (!employee) throw new NotFoundException(`Employee ${employeeId} not found`)

    const viewer = viewerEmployeeId
      ? await this.prisma.employee.findUnique({ where: { employeeNumber: viewerEmployeeId }, select: { isAdmin: true } })
      : null
    const isOwnerOrAdmin = viewerEmployeeId === employeeId || Boolean(viewer?.isAdmin)

    const [workExperience, education, certifications, skills] = await Promise.all([
      this.prisma.employeeWorkExperience.findMany({
        where: { employeeId },
        orderBy: [{ isCurrent: "desc" }, { startDate: "desc" }],
      }),
      this.prisma.employeeEducation.findMany({
        where: { employeeId, ...(isOwnerOrAdmin ? {} : { verificationStatus: "VERIFIED" }) },
        include: {
          institutionRef: true,
          addedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
          verifiedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
        },
        orderBy: { startDate: "desc" },
      }),
      this.prisma.employeeCertification.findMany({
        where: { employeeId, ...(isOwnerOrAdmin ? {} : { verificationStatus: "VERIFIED" }) },
        include: {
          addedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
          verifiedBy: { select: { employeeNumber: true, firstName: true, lastName: true } },
        },
        orderBy: { issueDate: "desc" },
      }),
      this.prisma.employeeSkill.findMany({
        where: { employeeId },
        include: { skill: true },
        orderBy: { skill: { name: "asc" } },
      }),
    ])

    return {
      employee,
      workExperience,
      education,
      certifications: certifications.map(withCertStatus),
      skills,
      isOwnerOrAdmin,
    }
  }
}
