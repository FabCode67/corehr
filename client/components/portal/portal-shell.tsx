"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import type { LucideIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import type { SessionUser } from "@/lib/session"

import { NotificationBell } from "./notification-bell"

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

  // The single nav item whose href is the longest matching prefix of the
  // current path — plain per-item startsWith() would make a short href
  // like "/admin" match every page under it (including other nav items'
  // own subtrees, e.g. "/admin/employees"), highlighting Dashboard
  // everywhere. Only ever matters for hrefs that are a strict prefix of
  // another nav item's href — "/admin" is one, since /admin/profile,
  // /admin/hr-analytics, etc. all sit underneath it.
  const activeHref = [...nav]
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  return (
    <div className="relative flex min-h-svh bg-muted/30">
      {/* Same brand background used on login/change-password/landing —
       *  kept very low-opacity here since this sits behind data-dense
       *  dashboard content, not a hero. -z-10 (not DOM order) is what keeps
       *  it behind the sidebar/header, since those are plain non-positioned
       *  elements and would otherwise be painted below any position:absolute
       *  sibling regardless of who comes first in markup. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 opacity-[0.05] dark:opacity-[0.16]"
        style={{
          backgroundImage: "url(/background.svg)",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground md:flex">
        <div className="flex h-16 items-center gap-2.5 border-b border-sidebar-border px-5">
          <img src="/ncba-mark.svg" alt="NCBA" className="size-8 shrink-0" />
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-semibold">PeopleSuite</p>
            <p className="truncate text-xs text-muted-foreground">{portalLabel}</p>
          </div>
        </div>

        {/* Admins have two portals — this bank-wide Admin Portal and their
         *  own self-service Staff Portal (same as any employee's "My
         *  Profile" experience). A regular staff member only ever has the
         *  one portal, so this switcher only renders for admins — it's not
         *  gated by which portal is currently open, since Employee.isAdmin
         *  doesn't change based on which side you're browsing. */}
        {user.role === "admin" ? (
          <div className="flex gap-1 border-b border-sidebar-border p-3">
            <Link
              href="/admin"
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors",
                portalLabel === "Admin Portal"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              Admin Portal
            </Link>
            <Link
              href="/staff"
              className={cn(
                "flex-1 rounded-md px-2 py-1.5 text-center text-xs font-medium transition-colors",
                portalLabel === "Staff Portal"
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )}
            >
              My Profile Portal
            </Link>
          </div>
        ) : null}

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {nav.map((item) => {
            const active = item.href === activeHref
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
            <ThemeToggle />
            <NotificationBell employeeId={user.employeeId} />
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
