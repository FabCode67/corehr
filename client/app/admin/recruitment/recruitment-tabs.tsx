"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const TABS = [
  { label: "Dashboard", href: "/admin/recruitment" },
  { label: "Workforce Plans", href: "/admin/recruitment/workforce-plans" },
  { label: "Job Requisitions", href: "/admin/recruitment/requisitions" },
  { label: "Job Descriptions", href: "/admin/recruitment/job-descriptions" },
  { label: "Job Postings", href: "/admin/recruitment/job-postings" },
  { label: "Candidates", href: "/admin/recruitment/candidates" },
  { label: "Applications", href: "/admin/recruitment/applications" },
  { label: "Workflows", href: "/admin/recruitment/workflows" },
]

export function RecruitmentTabs() {
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active = tab.href === "/admin/recruitment" ? pathname === tab.href : pathname.startsWith(tab.href)
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
