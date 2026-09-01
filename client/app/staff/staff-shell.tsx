"use client"

import {
  CalendarDays,
  CalendarCheck,
  ClipboardCheck,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Scale,
  Target,
  User,
  Users,
  UserCircle,
} from "lucide-react"

import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell"
import type { SessionUser } from "@/lib/session"

import { logout } from "../login/actions"

const STAFF_NAV: PortalNavItem[] = [
  { label: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "My Profile", href: "/staff/profile", icon: User },
  { label: "Professional Profile", href: "/staff/professional-profile", icon: UserCircle },
  { label: "My Onboarding", href: "/staff/onboarding", icon: ClipboardCheck },
  { label: "Leave", href: "/staff/leave", icon: CalendarDays },
  // Shown to everyone, not just people who currently manage someone — same
  // reasoning as the "My team" dashboard card: this app's session doesn't
  // carry a live "is this person a manager" flag (SessionUser is a static
  // cookie set at login), and re-deriving it here would mean another API
  // call on every single page render just to decide whether to show a nav
  // link. The page itself renders a clean empty state when there's nothing
  // pending, so no harm in always showing the entry.
  { label: "Team Approvals", href: "/staff/leave/approvals", icon: CalendarCheck },
  { label: "Performance", href: "/staff/performance", icon: Target },
  { label: "Learning", href: "/staff/learning", icon: GraduationCap },
  { label: "Family & Dependents", href: "/staff/family", icon: Users },
  { label: "Forms & Requests", href: "/staff/forms", icon: FileText },
  { label: "Employee Relations", href: "/staff/employee-relations", icon: Scale },
]

export function StaffShell({
  user,
  children,
}: {
  user: SessionUser
  children: React.ReactNode
}) {
  return (
    <PortalShell user={user} portalLabel="Staff Portal" nav={STAFF_NAV} logoutAction={logout}>
      {children}
    </PortalShell>
  )
}
