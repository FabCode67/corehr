import { redirect } from "next/navigation"

import { getSession } from "@/lib/get-session"

import { AdminShell } from "./admin-shell"

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  // Also enforced by middleware.ts; kept here so this layout — and every
  // page under it — can rely on `session` being a non-null admin.
  if (!session) {
    redirect("/login")
  }

  if (session.role !== "admin") {
    redirect("/staff")
  }

  return <AdminShell user={session}>{children}</AdminShell>
}
