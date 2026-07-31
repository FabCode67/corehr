import { Injectable } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

import type { AiToolDefinition, ReportLinkArtifact, ToolContext } from "./types"

/**
 * Report-generation tool. Deliberately does NOT generate a file itself —
 * it reuses the exact export endpoints the HR Analytics dashboard already
 * exposes (server/src/modules/hr-analytics/hr-analytics-export.controller.ts,
 * proxied client-side at /api/hr-analytics/export/<format>), so a report the
 * assistant "generates" is byte-for-byte the same Excel/CSV/PDF/PowerPoint a
 * human would get clicking Export on the dashboard — same numbers, same role
 * scoping, same formatting. This tool just resolves a department name to an
 * id (for the assistant's convenience) and builds the matching query string.
 */
@Injectable()
export class ReportToolsProvider {
  constructor(private readonly prisma: PrismaService) {}

  getTools(): AiToolDefinition[] {
    return [
      {
        name: "generate_report",
        description:
          "Generate a downloadable HR analytics report (Excel, CSV, PDF, or PowerPoint) covering workforce KPIs and charts, optionally filtered by department and/or year. Returns a download link — tell the user it's ready and let them click it, don't try to describe the file's binary contents.",
        inputSchema: {
          type: "object",
          properties: {
            format: { type: "string", enum: ["xlsx", "csv", "pdf", "pptx"], description: "File format." },
            departmentName: { type: "string", description: "Optional department name to scope the report to." },
            year: { type: "number", description: "Optional year to scope the report to." },
          },
          required: ["format"],
        },
        handler: async (input, ctx: ToolContext) => {
          const format = String(input.format ?? "xlsx") as ReportLinkArtifact["format"]
          if (!["xlsx", "csv", "pdf", "pptx"].includes(format)) {
            return { forModel: { error: `Unsupported format "${format}". Use one of xlsx, csv, pdf, pptx.` } }
          }

          const params = new URLSearchParams()
          params.set("actingEmployeeId", ctx.actingEmployeeId)

          if (typeof input.departmentName === "string" && input.departmentName.trim()) {
            const match = await this.prisma.department.findFirst({ where: { name: { contains: input.departmentName, mode: "insensitive" } } })
            if (match) params.set("departmentId", match.id)
          }
          if (typeof input.year === "number") params.set("year", String(input.year))

          const url = `/api/hr-analytics/export/${format}?${params.toString()}`
          const reportLink: ReportLinkArtifact = { title: `HR Analytics Report (${format.toUpperCase()})`, format, url }

          return {
            forModel: { status: "ready", format, downloadUrl: url },
            reportLink,
          }
        },
      },
    ]
  }
}
