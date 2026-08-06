"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

/** Same pattern as app/admin/leave/leave-tabs.tsx — a section's sub-pages
 *  stay real routes (each keeps its own heavy server-side data fetching,
 *  loaded lazily only when that tab is visited) but aren't top-level
 *  sidebar items; this tab bar is how you move between them. Dashboard,
 *  Executive Dashboard, and HR Analytics used to be three separate
 *  AdminShell nav entries — consolidated into one "Dashboard" entry with
 *  these three tabs per request. */
const TABS = [
  { label: "Overview", href: "/admin" },
  { label: "Executive Summary", href: "/admin/executive-dashboard" },
  { label: "HR Analytics", href: "/admin/hr-analytics" },
]

export function DashboardTabs() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        // "/admin" is the root of the whole admin portal, not just this
        // section — unlike LeaveTabs's base href, a plain startsWith() here
        // would make "Overview" match every admin page. Exact-match it.
        const active = tab.href === "/admin" ? pathname === "/admin" : pathname === tab.href || pathname.startsWith(tab.href + "/")
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "border-b-2 px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "border-primary text-foreground"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </div>
  )
}
