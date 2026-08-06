"use client"

import {
  Bot,
  Briefcase,
  Building2,
  CalendarDays,
  ClipboardCheck,
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
  // Overview and Executive Summary used to be their own tabs alongside HR
  // Analytics under this one "Dashboard" entry — both were removed and
  // folded into HR Analytics per request, so this now points straight at
  // it ("/admin" itself just redirects here for old links/bookmarks).
  { label: "HR Analytics", href: "/admin/hr-analytics", icon: LayoutDashboard },
  // Switching to the Staff Portal ("My Profile") now happens via the
  // Admin Portal / My Profile Portal toggle at the top of the sidebar, not
  // a nav entry — see PortalShell.
  { label: "My Profile", href: "/admin/profile", icon: User },
  { label: "Employees", href: "/admin/employees", icon: Users },
  { label: "Departments", href: "/admin/departments", icon: Building2 },
  { label: "Locations", href: "/admin/branches", icon: MapPin },
  { label: "Positions", href: "/admin/positions", icon: Briefcase },
  { label: "Recruitment", href: "/admin/recruitment", icon: Briefcase },
  { label: "Onboarding Documents", href: "/admin/onboarding-documents", icon: ClipboardCheck },
  { label: "Leave Management", href: "/admin/leave", icon: CalendarDays },
  { label: "Performance", href: "/admin/performance", icon: Target },
  { label: "Learning & Development", href: "/admin/learning", icon: GraduationCap },
  { label: "Forms Management", href: "/admin/forms", icon: FileText },
  { label: "Employee Relations", href: "/admin/employee-relations", icon: Scale },
  { label: "Organization", href: "/admin/organization", icon: Building2 },
  { label: "AI Assistant", href: "/admin/ai-assistant", icon: Bot },
  { label: "Bulk Imports", href: "/admin/imports", icon: Upload },
  { label: "Email Notifications", href: "/admin/email", icon: Mail },
  { label: "Professional Profiles", href: "/admin/professional-profile/review", icon: UserCircle },
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
