"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import type { SessionUser } from "@/lib/session"

export interface PortalNavItem {
  label: string
  href: string
  icon: LucideIcon
}

interface PortalShellProps {
  user: SessionUser
  portalLabel: string
  nav: PortalNavItem[]
  logoutAction: () => void | Promise<void>
  children: React.ReactNode
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase()
}

export function PortalShell({
  user,
  portalLabel,
  nav,
  logoutAction,
  children,
}: PortalShellProps) {
  const pathname = usePathname()

  return (
    <div className="flex min-h-svh bg-muted/30">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <img src="/ncba-mark.svg" alt="NCBA" className="size-8 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">PeopleSuite</p>
            <p className="truncate text-xs text-muted-foreground">{portalLabel}</p>
          </div>
        </div>
        <div
          aria-hidden="true"
          className="h-1.5 w-full shrink-0"
          style={{
            backgroundImage: "url(/patterns/kitenge-dark.svg)",
            backgroundSize: "90px 106px",
            backgroundRepeat: "repeat",
          }}
        />

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/")
            const Icon = item.icon

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="size-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3">
          <form action={logoutAction}>
            <Button type="submit" variant="outline" size="sm" className="w-full justify-start">
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-foreground">
              Welcome back, {user.name.split(" ")[0]}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {user.jobTitle} · {user.department}
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-3">
            <div className="hidden text-right sm:block">
              <p className="text-sm leading-tight font-medium">{user.name}</p>
              <p className="text-xs leading-tight text-muted-foreground">{user.branch}</p>
            </div>
            <div className="flex size-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
              {initials(user.name)}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  )
}
