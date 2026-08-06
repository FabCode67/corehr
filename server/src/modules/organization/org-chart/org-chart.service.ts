import { Injectable, NotFoundException } from "@nestjs/common"

import { PrismaService } from "../../../prisma/prisma.service"

export interface OrgChartNode {
  id: string
  title: string
  department: { id: string; name: string }
  unit: { id: string; name: string } | null
  level: { id: string; name: string; code: string | null; rank: number; track: string }
  employees: {
    employeeNumber: string
    firstName: string
    lastName: string
    /** Band lives on Employee, not Position (a position is a reusable
     *  role/template multiple employees can hold — see Position's schema
     *  doc comment) — null only if that employee's band is somehow unset. */
    band: { id: string; name: string } | null
  }[]
  directReports: OrgChartNode[]
}

@Injectable()
export class OrgChartService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Builds the org chart as a tree, entirely from Position.reportsToPositionId
   * — nothing about the hierarchy is hardcoded. Loads every active position
   * in one query, then assembles the tree in memory (cheap: the whole org is
   * a few thousand rows at most, not worth N+1 recursive queries).
   *
   * @param rootPositionId Optional — return the subtree under this position
   *   instead of the whole org (e.g. "show me this department's chart").
   */
  async getTree(rootPositionId?: string): Promise<OrgChartNode[]> {
    const positions = await this.prisma.position.findMany({
      where: { isActive: true },
      include: {
        department: { select: { id: true, name: true } },
        unit: { select: { id: true, name: true } },
        level: { select: { id: true, name: true, code: true, rank: true, track: true } },
        employees: {
          where: { isActive: true },
          select: { employeeNumber: true, firstName: true, lastName: true, band: { select: { id: true, name: true } } },
        },
      },
      orderBy: { title: "asc" },
    })

    const nodesById = new Map<string, OrgChartNode>()
    for (const position of positions) {
      nodesById.set(position.id, {
        id: position.id,
        title: position.title,
        department: position.department,
        unit: position.unit,
        level: position.level,
        employees: position.employees,
        directReports: [],
      })
    }

    const roots: OrgChartNode[] = []
    // Guards against a cycle in the data (which PositionsService should
    // prevent going forward, but old/bad data or a direct DB edit could
    // still introduce one) — a visited set stops infinite attachment loops.
    const attached = new Set<string>()

    for (const position of positions) {
      const node = nodesById.get(position.id)!
      const parentId = position.reportsToPositionId

      if (!parentId) {
        roots.push(node)
        continue
      }

      const parentNode = nodesById.get(parentId)
      if (!parentNode) {
        // Parent is inactive/missing — surface this position as its own
        // root rather than silently dropping it from the chart.
        roots.push(node)
        continue
      }

      const edgeKey = `${parentId}->${position.id}`
      if (attached.has(edgeKey)) continue
      attached.add(edgeKey)

      parentNode.directReports.push(node)
    }

    if (!rootPositionId) {
      return roots
    }

    const requestedRoot = nodesById.get(rootPositionId)
    if (!requestedRoot) {
      throw new NotFoundException(`Position ${rootPositionId} not found or inactive`)
    }

    return [requestedRoot]
  }
}
