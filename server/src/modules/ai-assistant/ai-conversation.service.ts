import { Injectable, NotFoundException } from "@nestjs/common"
import type { Prisma } from "@prisma/client"

import { PrismaService } from "../../prisma/prisma.service"

@Injectable()
export class AiConversationService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrCreate(conversationId: string | undefined, employeeId: string) {
    if (conversationId) {
      const existing = await this.prisma.aiConversation.findUnique({ where: { id: conversationId } })
      if (!existing) throw new NotFoundException("Conversation not found.")
      if (existing.employeeId !== employeeId) throw new NotFoundException("Conversation not found.")
      return existing
    }
    return this.prisma.aiConversation.create({ data: { employeeId } })
  }

  async setTitleIfUnset(conversationId: string, title: string) {
    await this.prisma.aiConversation.updateMany({ where: { id: conversationId, title: null }, data: { title: title.slice(0, 120) } })
  }

  async touch(conversationId: string) {
    await this.prisma.aiConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } })
  }

  async appendMessage(
    conversationId: string,
    role: "USER" | "ASSISTANT",
    content: string,
    extra?: { toolCalls?: unknown; artifacts?: unknown }
  ) {
    return this.prisma.aiMessage.create({
      data: {
        conversationId,
        role,
        content,
        toolCalls: (extra?.toolCalls as Prisma.InputJsonValue) ?? undefined,
        artifacts: (extra?.artifacts as Prisma.InputJsonValue) ?? undefined,
      },
    })
  }

  async history(conversationId: string) {
    return this.prisma.aiMessage.findMany({ where: { conversationId }, orderBy: { createdAt: "asc" } })
  }

  async listForEmployee(employeeId: string) {
    return this.prisma.aiConversation.findMany({
      where: { employeeId },
      orderBy: { updatedAt: "desc" },
      take: 50,
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    })
  }

  async getWithMessages(conversationId: string, employeeId: string) {
    const conversation = await this.prisma.aiConversation.findUnique({
      where: { id: conversationId },
      include: {
        messages: { orderBy: { createdAt: "asc" } },
        actions: { orderBy: { createdAt: "asc" } },
      },
    })
    if (!conversation || conversation.employeeId !== employeeId) throw new NotFoundException("Conversation not found.")
    return conversation
  }
}
