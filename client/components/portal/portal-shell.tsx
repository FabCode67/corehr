"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronDown, type LucideIcon } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { cn } from "@/lib/utils"
import type { SessionUser } from "@/lib/session"

import { NotificationBell } from "./notification-bell"

export interface PortalNavChild {
  label: string
  href: string
  icon?: LucideIcon
}

export interface PortalNavItem {
  label: string
  href: string
  icon: LucideIcon
  /** When present the item is a collapsible group: `href` is its landing
   *  page, and the children render indented underneath. */
  children?: PortalNavChild[]
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
  const allLinks: { href: string }[] = nav.flatMap((item) => [item, ...(item.children ?? [])])
  const activeHref = allLinks
    .filter((item) => pathname === item.href || pathname.startsWith(item.href + "/"))
    .sort((a, b) => b.href.length - a.href.length)[0]?.href

  // Groups the user has explicitly toggled; a group is otherwise open while
  // the current page is inside it.
  const [toggled, setToggled] = useState<Record<string, boolean>>({})

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
            const Icon = item.icon
            const linkClass = (active: boolean) =>
              cn(
                "flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
              )

            if (!item.children?.length) {
              return (
                <Link key={item.href} href={item.href} className={linkClass(item.href === activeHref)}>
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            }

            const inGroup = pathname === item.href || pathname.startsWith(item.href + "/")
            const open = toggled[item.href] ?? inGroup

            return (
              <div key={item.href}>
                <div className="flex items-center">
                  <Link href={item.href} className={cn(linkClass(item.href === activeHref), "flex-1")}>
                    <Icon className="size-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </Link>
                  <button
                    type="button"
                    aria-label={`${open ? "Collapse" : "Expand"} ${item.label}`}
                    aria-expanded={open}
                    onClick={() => setToggled((prev) => ({ ...prev, [item.href]: !open }))}
                    className="ml-1 rounded-md p-2 text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                  >
                    <ChevronDown className={cn("size-4 transition-transform", open ? "rotate-180" : "")} />
                  </button>
                </div>
                {open ? (
                  <div className="mt-1 ml-5 space-y-1 border-l border-sidebar-border pl-2">
                    {item.children.map((child) => {
                      const ChildIcon = child.icon
                      return (
                        <Link key={child.href} href={child.href} className={linkClass(child.href === activeHref)}>
                          {ChildIcon ? <ChildIcon className="size-4 shrink-0" /> : null}
                          <span className="truncate">{child.label}</span>
                        </Link>
                      )
                    })}
                  </div>
                ) : null}
              </div>
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
            <NotificationBell employeeId={user.employeeId} role={user.role} />
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
