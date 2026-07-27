"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const TABS = [
  { label: "Dashboard", href: "/admin/learning" },
  { label: "Course Catalogue", href: "/admin/learning/courses" },
  { label: "Training Categories", href: "/admin/learning/training-categories" },
  { label: "Institutions", href: "/admin/learning/institutions" },
  { label: "Assigned Courses", href: "/admin/learning/assignments" },
  { label: "Learning Plans", href: "/admin/learning/plans" },
  { label: "Training Calendar", href: "/admin/learning/calendar" },
  { label: "Learning Reports", href: "/admin/learning/reports" },
]

export function LearningTabs() {
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active = tab.href === "/admin/learning" ? pathname === tab.href : pathname.startsWith(tab.href)
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
