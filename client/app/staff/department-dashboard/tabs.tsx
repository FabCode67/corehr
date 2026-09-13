import Link from "next/link"

import { cn } from "@/lib/utils"

const TABS = [
  { key: "overview", label: "Overview", href: "/staff/department-dashboard" },
  { key: "employees", label: "Employees", href: "/staff/department-dashboard/employees" },
  { key: "positions", label: "Positions", href: "/staff/department-dashboard/positions" },
  { key: "learning", label: "Learning Hours", href: "/staff/department-dashboard/learning" },
  { key: "org-chart", label: "Org Chart", href: "/staff/department-dashboard/org-chart" },
  { key: "requisitions", label: "Requisitions", href: "/staff/department-dashboard/requisitions" },
  { key: "leave", label: "Leave", href: "/staff/department-dashboard/leave" },
  { key: "performance", label: "Performance", href: "/staff/department-dashboard/performance" },
] as const

export type DepartmentDashboardTabKey = (typeof TABS)[number]["key"]

/** Shared sub-nav across every Head of Department portal page — each page
 *  is its own route (not client-side tab state) so the department picker
 *  above it (a plain Link href="?dept=...", see page.tsx) keeps working via
 *  a normal navigation rather than needing to be reimplemented per tab. */
export function DepartmentDashboardTabs({ active, dept }: { active: DepartmentDashboardTabKey; dept: string }) {
  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => (
        <Link
          key={tab.key}
          href={`${tab.href}?dept=${dept}`}
          className={cn(
            "rounded-t-md border-b-2 px-3 py-2 text-sm font-medium transition-colors",
            tab.key === active
              ? "border-primary text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  )
}
