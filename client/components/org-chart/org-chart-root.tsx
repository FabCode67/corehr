"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import type { OrgChartNode as OrgChartNodeData } from "@/lib/org-chart"

import { NodeCard, OrgChartNode } from "./org-chart-node"
import styles from "./org-chart.module.css"

interface OrgChartRootProps {
  root: OrgChartNodeData
}

/**
 * The very top of the chart gets special treatment: rather than showing
 * the Managing Director as one card with five siblings (CEO/COO/CTO/CFO
 * plus unrelated department heads) hanging off it at the same level, this
 * groups every position that belongs to the ROOT'S OWN department (i.e.
 * the whole Executive Management team) into one entry card. Expanding it
 * reveals that team as a cluster, plus — at the same tier — the actual
 * next-tier departments (whose heads report to the Managing Director but
 * belong to a different department).
 */
export function OrgChartRoot({ root }: OrgChartRootProps) {
  const [expanded, setExpanded] = useState(false)

  // Only childless same-department reports go into the compact cluster —
  // it renders plain (non-interactive) cards with no way to expand
  // further, so a same-department report that unexpectedly *does* have
  // its own reports must fall through to the normal, fully-recursive
  // rendering below instead, or that whole subtree would be silently
  // dropped from the chart.
  const clusterableSameDepartment = root.directReports.filter(
    (report) => report.department.id === root.department.id && report.directReports.length === 0
  )
  const otherReports = root.directReports.filter(
    (report) => !clusterableSameDepartment.includes(report)
  )
  const teamMembers = [root, ...clusterableSameDepartment]
  const hasChildren = root.directReports.length > 0
  const rootLead = root.employees[0]

  return (
    <li>
      <div className={styles.nodeWrap}>
        <div
          className={cn(
            "relative w-[220px] rounded-lg border p-3 text-left shadow-lg",
            "bg-gradient-to-b from-[#123a61] to-[#0d2c4d] border-[#B8860B]/60"
          )}
        >
          <div className="flex items-center gap-1.5">
            <Users className="size-3.5 shrink-0 text-[#B8860B]" />
            <p className="text-[13px] leading-tight font-semibold text-white">
              {root.department.name}
            </p>
          </div>

          {rootLead ? (
            <p className="mt-1.5 truncate text-[11px] text-blue-100">
              Led by {rootLead.firstName} {rootLead.lastName}
            </p>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-1">
            <span className="rounded bg-[#B8860B]/20 px-1.5 py-0.5 text-[9px] font-semibold text-[#e0b84a]">
              {teamMembers.length} {teamMembers.length === 1 ? "position" : "positions"}
            </span>
          </div>
        </div>

        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={cn(
              styles.toggle,
              "border border-white/20 bg-[#0d2c4d] text-blue-200 hover:bg-[#123a61]"
            )}
            aria-label={expanded ? `Collapse ${root.department.name}` : `Expand ${root.department.name}`}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        ) : null}
      </div>

      {hasChildren && expanded ? (
        <ul>
          <li>
            <div className={styles.execCluster}>
              <span className={styles.execLabel}>{root.department.name}</span>
              <div className={styles.execCards}>
                {teamMembers.map((member) => (
                  <NodeCard key={member.id} node={member} compact />
                ))}
              </div>
            </div>
          </li>

          {otherReports.map((child) => (
            <OrgChartNode key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
