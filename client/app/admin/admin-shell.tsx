"use client"

import {
  BarChart3,
  Briefcase,
  Building2,
  CalendarDays,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  MapPin,
  Scale,
  Settings,
  Target,
  User,
  Users,
} from "lucide-react"

import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell"
import type { SessionUser } from "@/lib/session"

import { logout } from "../login/actions"

const ADMIN_NAV: PortalNavItem[] = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "My Profile", href: "/admin/profile", icon: User },
  { label: "Employees", href: "/admin/employees", icon: Users },
  { label: "Departments", href: "/admin/departments", icon: Building2 },
  { label: "Branches", href: "/admin/branches", icon: MapPin },
  { label: "Positions", href: "/admin/positions", icon: Briefcase },
  { label: "Recruitment", href: "/admin/recruitment", icon: Briefcase },
  { label: "Leave Management", href: "/admin/leave", icon: CalendarDays },
  { label: "Attendance", href: "/admin/attendance", icon: Clock3 },
  { label: "Performance", href: "/admin/performance", icon: Target },
  { label: "Learning & Development", href: "/admin/learning", icon: GraduationCap },
  { label: "Forms Management", href: "/admin/forms", icon: FileText },
  { label: "Employee Relations", href: "/admin/employee-relations", icon: Scale },
  { label: "Organization", href: "/admin/organization", icon: Building2 },
  { label: "Reports", href: "/admin/reports", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminShell({
  user,
  children,
}: {
  user: SessionUser
  children: React.ReactNode
}) {
  return (
    <PortalShell user={user} portalLabel="Admin Portal" nav={ADMIN_NAV} logoutAction={logout}>
      {children}
    </PortalShell>
  )
}
