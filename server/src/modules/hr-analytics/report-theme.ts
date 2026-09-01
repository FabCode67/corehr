import { existsSync } from "fs"
import { join } from "path"

/**
 * Shared branding for every generated report (PDF + PowerPoint) coming out
 * of HrAnalyticsExportService. Pulled into one place because these hex
 * values were previously hardcoded four times over — once each in the
 * client's kpi-cards.tsx/charts.tsx/chart-tooltip.tsx, and again inline in
 * this export service's PPTX slides — with no single source of truth. This
 * file is the source of truth for the *server-generated report* palette;
 * the client dashboard's own chart colors are a separate concern (same
 * values, kept in sync by eye rather than a shared import, since the client
 * can't import server code and vice versa).
 */
export const REPORT_THEME = {
  colors: {
    navy: "0A2647",
    gold: "B8860B",
    purple: "7F77DD",
    mint: "5DCAA5",
    pink: "D4537E",
    orange: "D85A30",
    teal: "2E7D6B",
    brown: "3B2412",
    text: "333333",
    muted: "555555",
    mutedLight: "888888",
    border: "CCCCCC",
  },
  /** Cycled through for multi-series charts that don't have an obviously
   *  "correct" color (e.g. band/department breakdowns) — same seven values
   *  used across the client dashboard's own charts, for visual continuity
   *  between what an exec sees on screen and what's in the exported file. */
  chartPalette: ["0A2647", "B8860B", "7F77DD", "5DCAA5", "D4537E", "D85A30", "2E7D6B"],
} as const

/** Threshold constants behind buildRecommendations()/buildCustomRecommendations()
 *  in hr-analytics-export.service.ts — pulled out here so both the fixed-format
 *  and Custom Report Builder exports reason about the same numbers, and so a
 *  future "make these configurable per-tenant" pass has one place to start.
 *  Values chosen to match the spec's own worked examples (95% AML target,
 *  "prioritize recruitment" for under-filled departments, etc.). */
export const REPORT_TARGETS = {
  /** Departments below this fill rate get called out for recruitment focus. */
  positionFillRatePercent: 90,
  /** Org-wide leave utilization below this triggers an "encourage leave" recommendation. */
  leaveUtilizationPercent: 75,
  /** AML completion below this triggers a training-participation recommendation. */
  amlCompliancePercent: 95,
  /** Attrition rate above this triggers a retention-focus recommendation. */
  attritionWatchPercent: 10,
} as const

/** Resolves to the copy of the NCBA logo bundled alongside this module (see
 *  nest-cli.json's `compilerOptions.assets` entry for hr-analytics, which
 *  copies this folder into dist the same way modules/forms/pdf/fonts is
 *  copied for the signature font) — falls back to null so callers can draw
 *  a text wordmark instead when the asset genuinely isn't present rather
 *  than crashing the export. */
export function resolveLogoPath(): string | null {
  const path = join(__dirname, "assets", "ncba-logo.png")
  return existsSync(path) ? path : null
}

/** "January 2026" — used for report period labels; Intl's "long" month name
 *  reads better on a cover page than a numeric date. */
export function formatMonthYear(date: Date): string {
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" })
}

/** Turns a resolved {from, to} date range (see resolveDateRange() in
 *  hr-analytics-filters.util.ts) into the cover page's period line —
 *  "All time" when no date filter is set at all, an open-ended phrase when
 *  only one side is set, and "Month Year – Month Year" when both are. */
export function formatReportPeriod(range: { from?: Date; to?: Date }): string {
  if (range.from && range.to) return `${formatMonthYear(range.from)} – ${formatMonthYear(range.to)}`
  if (range.from) return `From ${formatMonthYear(range.from)}`
  if (range.to) return `Through ${formatMonthYear(range.to)}`
  return "All time"
}
