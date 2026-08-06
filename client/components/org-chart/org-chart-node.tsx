"use client"

import { useState } from "react"
import { ChevronDown, ChevronRight, Circle, User } from "lucide-react"

import { cn } from "@/lib/utils"
import type { OrgChartNode as OrgChartNodeData } from "@/lib/org-chart"

import styles from "./org-chart.module.css"

interface OrgChartNodeProps {
  node: OrgChartNodeData
  defaultExpanded?: boolean
}

export function OrgChartNode({ node, defaultExpanded = false }: OrgChartNodeProps) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const hasChildren = node.directReports.length > 0

  // Childless EXECUTIVE-track reports (CEO/COO/CTO/CFO-style roles) get
  // grouped into one compact cluster instead of sitting as full-size
  // siblings next to department heads — see tree-comments in the CSS
  // module. An executive that unexpectedly *does* have reports falls
  // through to the normal per-node rendering below so nothing is lost.
  const clusterableExecs = node.directReports.filter(
    (report) => report.level.track === "EXECUTIVE" && report.directReports.length === 0
  )
  const remainingReports = node.directReports.filter(
    (report) => !(report.level.track === "EXECUTIVE" && report.directReports.length === 0)
  )

  return (
    <li>
      <div className={styles.nodeWrap}>
        <NodeCard node={node} />

        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded((value) => !value)}
            className={cn(
              styles.toggle,
              "border border-white/20 bg-[#0d2c4d] text-blue-200 hover:bg-[#123a61]"
            )}
            aria-label={expanded ? `Collapse ${node.title}` : `Expand ${node.title}`}
            aria-expanded={expanded}
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
          </button>
        ) : null}
      </div>

      {hasChildren && expanded ? (
        <ul>
          {clusterableExecs.length > 0 ? (
            <li>
              <div className={styles.execCluster}>
                <span className={styles.execLabel}>Executive Team</span>
                <div className={styles.execCards}>
                  {clusterableExecs.map((exec) => (
                    <NodeCard key={exec.id} node={exec} compact />
                  ))}
                </div>
              </div>
            </li>
          ) : null}

          {remainingReports.map((child) => (
            <OrgChartNode key={child.id} node={child} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function NodeCard({ node, compact = false }: { node: OrgChartNodeData; compact?: boolean }) {
  const isVacant = node.employees.length === 0
  const isExecutive = node.level.track === "EXECUTIVE"
  const primaryEmployee = node.employees[0]
  const extraCount = node.employees.length - 1

  return (
    <div
      className={cn(
        "relative rounded-lg border text-left shadow-lg",
        "bg-gradient-to-b from-[#123a61] to-[#0d2c4d]",
        compact ? "w-[150px] p-2.5" : "w-[200px] p-3",
        isVacant
          ? "border-destructive/60"
          : isExecutive
            ? "border-[#B8860B]/60"
            : "border-white/12"
      )}
    >
      {isVacant ? (
        <span
          className={cn(
            "mb-1 flex w-fit items-center gap-1 rounded-full border border-destructive/50 bg-destructive/20 font-medium tracking-wide text-rose-200 uppercase",
            compact ? "px-1 py-0.5 text-[8px]" : "px-1.5 py-0.5 text-[9px]"
          )}
        >
          <Circle className="size-1.5 fill-current" />
          Vacant
        </span>
      ) : null}

      <p
        className={cn(
          "leading-tight font-semibold text-white",
          compact ? "pr-0 text-[11px]" : "pr-2 text-[13px]"
        )}
      >
        {node.title}
      </p>

      {primaryEmployee ? (
        <div className={cn("flex items-center gap-1.5", compact ? "mt-1" : "mt-1.5")}>
          <User className={cn("shrink-0 text-[#B8860B]", compact ? "size-3" : "size-3.5")} />
          <span className={cn("truncate text-blue-100", compact ? "text-[10px]" : "text-[11px]")}>
            {primaryEmployee.firstName} {primaryEmployee.lastName}
            {extraCount > 0 ? ` +${extraCount} more` : ""}
          </span>
        </div>
      ) : null}

      {!compact ? (
        <p className="mt-1 text-[10px] tracking-wide text-blue-300/70 uppercase">
          {node.level.name}
        </p>
      ) : null}

      <div className={cn("flex flex-wrap items-center gap-1", compact ? "mt-1.5" : "mt-2")}>
        {node.level.code ? (
          <span className="rounded bg-[#B8860B]/20 px-1.5 py-0.5 text-[9px] font-semibold text-[#e0b84a]">
            {node.level.code}
          </span>
        ) : null}
        {primaryEmployee?.band ? (
          <span
            className={cn(
              "rounded bg-white/10 px-1.5 py-0.5 font-semibold text-blue-200",
              compact ? "text-[8px]" : "text-[9px]"
            )}
          >
            {primaryEmployee.band.name}
          </span>
        ) : null}
        {!compact ? (
          <span className="truncate rounded bg-[#3B2412]/50 px-1.5 py-0.5 text-[9px] text-[#e8c9a0]">
            {node.unit?.name ?? node.department.name}
          </span>
        ) : null}
      </div>
    </div>
  )
}
