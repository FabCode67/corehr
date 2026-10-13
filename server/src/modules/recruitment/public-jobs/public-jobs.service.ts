import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common"
import { Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"
import { UploadsService } from "../../uploads/uploads.service"
import { ApplicationsService } from "../applications/applications.service"
import { normalizeJdContent, contentFromFlat } from "../job-descriptions/jd-content"

import { APPLICATION_DOCUMENT_TYPES, type ApplicationDocumentType } from "./application-documents"
import { PublicApplyDto } from "./dto/public-apply.dto"

const PUBLIC_POSTING_SELECT = {
  id: true,
  postingTitle: true,
  description: true,
  responsibilities: true,
  qualifications: true,
  requiredExperience: true,
  employmentType: true,
  closingDate: true,
  publishedAt: true,
  shareSlug: true,
  requiredDocuments: true,
  branch: { select: { name: true } },
  jobDescription: true,
} as const

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "image/jpeg",
  "image/png",
])

@Injectable()
export class PublicJobsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
    private readonly applications: ApplicationsService
  ) {}

  private openWhere(): Prisma.JobPostingWhereInput {
    return { status: "PUBLISHED", closingDate: { gte: new Date() }, shareSlug: { not: null } }
  }

  async listOpen() {
    const rows = await this.prisma.jobPosting.findMany({
      where: this.openWhere(),
      select: { postingTitle: true, shareSlug: true, closingDate: true, employmentType: true, branch: { select: { name: true } } },
      orderBy: { publishedAt: "desc" },
    })
    return rows
  }

  async getBySlug(slug: string) {
    const posting = await this.prisma.jobPosting.findFirst({ where: { shareSlug: slug }, select: { ...PUBLIC_POSTING_SELECT, status: true } })
    if (!posting) throw new NotFoundException("This job posting doesn't exist.")
    const open = posting.status === "PUBLISHED" && posting.closingDate.getTime() >= Date.now()
    const { jobDescription, status: _status, ...rest } = posting
    return {
      ...rest,
      open,
      // Public candidates only need the role content, never internal fields
      // such as job holder or signature (blank in JDs anyway).
      summary: jobDescription ? (jobDescription.content ? normalizeJdContent(jobDescription.content) : contentFromFlat(jobDescription)).purpose : null,
    }
  }

  /** Creates (or reuses, by email) the Candidate and files the Application with
   *  its uploaded documents. Files are validated before anything is written. */
  async apply(slug: string, dto: PublicApplyDto, files: Express.Multer.File[]) {
    const posting = await this.prisma.jobPosting.findFirst({
      where: { shareSlug: slug },
      select: { id: true, status: true, closingDate: true, requiredDocuments: true },
    })
    if (!posting || posting.status !== "PUBLISHED" || posting.closingDate.getTime() < Date.now()) {
      throw new BadRequestException("This job is no longer accepting applications.")
    }

    const byType = new Map<ApplicationDocumentType, Express.Multer.File[]>()
    for (const file of files) {
      const type = file.fieldname as ApplicationDocumentType
      if (!APPLICATION_DOCUMENT_TYPES.includes(type)) throw new BadRequestException(`Unknown document type "${file.fieldname}".`)
      if (!ALLOWED_MIME_TYPES.has(file.mimetype)) throw new BadRequestException(`"${file.originalname}" must be a PDF, Word document, JPEG or PNG.`)
      if (file.size > MAX_FILE_SIZE_BYTES) throw new BadRequestException(`"${file.originalname}" is larger than 5 MB.`)
      byType.set(type, [...(byType.get(type) ?? []), file])
    }
    for (const required of ["CV", ...posting.requiredDocuments]) {
      if (!byType.has(required as ApplicationDocumentType)) {
        throw new BadRequestException(`Please upload: ${required.replaceAll("_", " ").toLowerCase()}.`)
      }
    }

    const email = dto.email.trim().toLowerCase()
    const candidateData = {
      firstName: dto.firstName.trim(),
      lastName: dto.lastName.trim(),
      phone: dto.phone.trim(),
      nationality: dto.nationality.trim(),
      education: dto.education,
      experience: dto.experience,
      certifications: dto.certifications,
      skills: dto.skills,
      linkedinUrl: dto.linkedinUrl,
      currentEmployer: dto.currentEmployer,
      currentPosition: dto.currentPosition,
    }
    const candidate = await this.prisma.candidate.upsert({
      where: { email },
      create: { email, ...candidateData },
      update: candidateData,
    })

    const already = await this.prisma.application.findFirst({ where: { candidateId: candidate.id, jobPostingId: posting.id }, select: { id: true } })
    if (already) throw new ConflictException("You have already applied for this job with this email address.")

    // Upload only after every validation passed, so rejected submissions leave no orphan files.
    const uploaded: { type: string; url: string; fileName: string }[] = []
    for (const [type, list] of byType) {
      for (const file of list) {
        const result = await this.uploads.upload(file, "recruitment-applications")
        uploaded.push({ type, url: result.secure_url, fileName: file.originalname })
      }
    }

    const application = await this.applications.create({ candidateId: candidate.id, jobPostingId: posting.id }, null, {
      coverNote: dto.coverNote,
    })
    await this.prisma.applicationDocument.createMany({ data: uploaded.map((u) => ({ ...u, applicationId: application.id })) })
    const cv = uploaded.find((u) => u.type === "CV")
    const cover = uploaded.find((u) => u.type === "COVER_LETTER")
    await this.prisma.candidate.update({ where: { id: candidate.id }, data: { cvUrl: cv?.url, coverLetterUrl: cover?.url } })

    return { applicationId: application.id }
  }
}
