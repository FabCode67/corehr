"use client"

import {
  ArrowRightLeft,
  BarChart3,
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
  Clock3,
  FileText,
  GraduationCap,
  LayoutDashboard,
  Mail,
  MapPin,
  Scale,
  Settings,
  Target,
  Upload,
  User,
  UserCircle,
  Users,
} from "lucide-react"

import { PortalShell, type PortalNavItem } from "@/components/portal/portal-shell"
import type { SessionUser } from "@/lib/session"

import { logout } from "../login/actions"

const ADMIN_NAV: PortalNavItem[] = [
  // Executive Dashboard and HR Analytics used to be their own nav entries —
  // consolidated under this one "Dashboard" entry, reachable as tabs (see
  // DashboardTabs) across /admin, /admin/executive-dashboard, and
  // /admin/hr-analytics, which all still exist as their own routes.
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "My Profile", href: "/admin/profile", icon: User },
  { label: "My Staff Dashboard", href: "/staff", icon: ArrowRightLeft },
  { label: "Employees", href: "/admin/employees", icon: Users },
  { label: "Departments", href: "/admin/departments", icon: Building2 },
  { label: "Locations", href: "/admin/branches", icon: MapPin },
  { label: "Positions", href: "/admin/positions", icon: Briefcase },
  { label: "Recruitment", href: "/admin/recruitment", icon: Briefcase },
  { label: "Onboarding Documents", href: "/admin/onboarding-documents", icon: ClipboardCheck },
  { label: "Leave Management", href: "/admin/leave", icon: CalendarDays },
  { label: "Attendance", href: "/admin/attendance", icon: Clock3 },
  { label: "Performance", href: "/admin/performance", icon: Target },
  { label: "Learning & Development", href: "/admin/learning", icon: GraduationCap },
  { label: "Forms Management", href: "/admin/forms", icon: FileText },
  { label: "Employee Relations", href: "/admin/employee-relations", icon: Scale },
  { label: "Organization", href: "/admin/organization", icon: Building2 },
  { label: "AI Assistant", href: "/admin/ai-assistant", icon: Bot },
  { label: "Bulk Imports", href: "/admin/imports", icon: Upload },
  { label: "Email Notifications", href: "/admin/email", icon: Mail },
  { label: "Professional Profiles", href: "/admin/professional-profile/review", icon: UserCircle },
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
