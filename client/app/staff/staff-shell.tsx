"use client"

import {
  CalendarDays,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Scale,
  Target,
  User,
  Users,
} from "lucide-react"

import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell"
import type { SessionUser } from "@/lib/session"

import { logout } from "../login/actions"

const STAFF_NAV: PortalNavItem[] = [
  { label: "Dashboard", href: "/staff", icon: LayoutDashboard },
  { label: "My Profile", href: "/staff/profile", icon: User },
  { label: "Leave", href: "/staff/leave", icon: CalendarDays },
  { label: "Attendance", href: "/staff/attendance", icon: Clock3 },
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
