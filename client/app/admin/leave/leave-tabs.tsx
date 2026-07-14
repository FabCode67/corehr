"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const TABS = [
  { label: "Approvals", href: "/admin/leave/approvals" },
  { label: "Calendar", href: "/admin/leave/calendar" },
  { label: "Analytics", href: "/admin/leave/analytics" },
  { label: "Settings", href: "/admin/leave/settings" },
]

export function LeaveTabs() {
  const pathname = usePathname()

  return (
    <div className="flex gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(tab.href + "/")
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
