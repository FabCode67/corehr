import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common"
import type { EmailStatus, Prisma } from "@prisma/client"

import { PrismaService } from "../../../prisma/prisma.service"

export interface ListEmailLogsParams {
  status?: string
  relatedModule?: string
  recipientEmployeeId?: string
  search?: string
  page?: number
  pageSize?: number
}

@Injectable()
export class EmailLogsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(params: ListEmailLogsParams) {
    const page = params.page && params.page > 0 ? params.page : 1
    const pageSize = params.pageSize && params.pageSize > 0 ? Math.min(params.pageSize, 200) : 50

    const where: Prisma.EmailLogWhereInput = {
      status: params.status ? (params.status as EmailStatus) : undefined,
      relatedModule: params.relatedModule || undefined,
      recipientEmployeeId: params.recipientEmployeeId || undefined,
      ...(params.search
        ? {
            OR: [
              { recipientEmail: { contains: params.search, mode: "insensitive" } },
              { subject: { contains: params.search, mode: "insensitive" } },
            ],
          }
        : {}),
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.emailLog.count({ where }),
      this.prisma.emailLog.findMany({
        where,
        include: { recipientEmployee: { select: { employeeNumber: true, firstName: true, lastName: true } } },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ])

    return { data, total, page, pageSize, totalPages: Math.ceil(total / pageSize) }
  }

  async findOne(id: string) {
    const log = await this.prisma.emailLog.findUnique({
      where: { id },
      include: { recipientEmployee: { select: { employeeNumber: true, firstName: true, lastName: true } } },
    })
    if (!log) throw new NotFoundException(`Email log ${id} not found.`)
    return log
  }

  /** Requeues a FAILED email for another attempt — resets it to PENDING with a
   *  fresh retry budget so EmailQueueProcessor picks it up on its next tick. */
  async retry(id: string) {
    const log = await this.findOne(id)
    if (log.status !== "FAILED") {
      throw new BadRequestException(`Only FAILED emails can be retried (this one is ${log.status}).`)
    }
    return this.prisma.emailLog.update({
      where: { id },
      data: { status: "PENDING", retryCount: 0, failureReason: null, nextAttemptAt: new Date() },
    })
  }

  async stats() {
    const grouped = await this.prisma.emailLog.groupBy({ by: ["status"], _count: { _all: true } })
    return grouped.reduce<Record<string, number>>((acc, row) => {
      acc[row.status] = row._count._all
      return acc
    }, {})
  }
}
