"use client"

import type { OrgChartNode as OrgChartNodeData } from "@/lib/org-chart"

import { OrgChartRoot } from "./org-chart-root"
import styles from "./org-chart.module.css"

interface OrgChartTreeProps {
  roots: OrgChartNodeData[]
}

/**
 * Renders the org chart. Handles the common case (one root — e.g. the
 * Managing Director) and the edge case (multiple disconnected roots, which
 * OrgChartService surfaces rather than dropping data — see its comments)
 * by giving each root its own independent connector tree side by side.
 */
export function OrgChartTree({ roots }: OrgChartTreeProps) {
  if (roots.length === 0) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg border border-dashed border-white/15 text-sm text-blue-200/70">
        No positions yet — create one to start building the org chart.
      </div>
    )
  }

  return (
    <div className={styles.chart}>
      {roots.length === 1 ? (
        <ul className={styles.tree}>
          <OrgChartRoot root={roots[0]} />
        </ul>
      ) : (
        <ul className={styles.rootList}>
          {roots.map((root) => (
            <li key={root.id}>
              <ul className={styles.tree}>
                <OrgChartRoot root={root} />
              </ul>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
