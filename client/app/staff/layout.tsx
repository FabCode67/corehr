import { redirect } from "next/navigation"

import { getSession } from "@/lib/get-session"

import { StaffShell } from "./staff-shell"

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getSession()

  // Also enforced by middleware.ts; kept here so this layout — and every
  // page under it — can rely on `session` being non-null.
  if (!session) {
    redirect("/login")
  }

  return <StaffShell user={session}>{children}</StaffShell>
}
