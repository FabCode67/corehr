import { redirect } from "next/navigation"

import { getSession } from "@/lib/get-session"

import { ChangePasswordForm } from "./change-password-form"

export default async function ChangePasswordPage() {
  const session = await getSession()
  if (!session) {
    redirect("/login")
  }
  if (!session.mustChangePassword) {
    redirect(session.role === "admin" ? "/admin" : "/staff")
  }

  return <ChangePasswordForm name={session.name} />
}
