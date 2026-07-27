"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

const TABS = [
  { label: "Dashboard", href: "/admin/forms" },
  { label: "Categories", href: "/admin/forms/categories" },
  { label: "Templates", href: "/admin/forms/templates" },
  { label: "Assigned Forms", href: "/admin/forms/assigned" },
  { label: "My Forms", href: "/admin/forms/my-forms" },
  { label: "Pending Signatures", href: "/admin/forms/pending-signatures" },
  { label: "Completed Forms", href: "/admin/forms/completed" },
]

export function FormsTabs() {
  const pathname = usePathname()

  return (
    <div className="flex flex-wrap gap-1 border-b border-border">
      {TABS.map((tab) => {
        const active = tab.href === "/admin/forms" ? pathname === tab.href : pathname.startsWith(tab.href)
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
