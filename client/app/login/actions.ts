"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { encodeSession, SESSION_COOKIE, type SessionUser } from "@/lib/session"

/**
 * Demo credential store. Replace with a call to the NestJS auth service
 * (POST /auth/login, verified against PostgreSQL via Prisma) once the
 * backend exists. Keeping this in a server-action file only means the
 * passwords below are never sent to the client bundle.
 */
const DEMO_USERS: Record<string, { password: string; user: SessionUser }> = {
  "admin@ncbarwanda.com": {
    password: "Admin@123",
    user: {
      id: "u-admin-1",
      name: "Aline Uwase",
      email: "admin@ncbarwanda.com",
      role: "admin",
      jobTitle: "HR Systems Administrator",
      department: "Human Resources",
      branch: "Head Office - Kigali",
    },
  },
  "staff@ncbarwanda.com": {
    password: "Staff@123",
    user: {
      id: "u-staff-1",
      name: "Eric Niyonzima",
      email: "staff@ncbarwanda.com",
      role: "staff",
      jobTitle: "Relationship Officer",
      department: "Retail Banking",
      branch: "Kigali City Branch",
    },
  },
}

export interface LoginState {
  error?: string
}

export async function login(
  _prevState: LoginState | undefined,
  formData: FormData
): Promise<LoginState> {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase()
  const password = String(formData.get("password") ?? "")

  const record = DEMO_USERS[email]

  if (!record || record.password !== password) {
    return { error: "Invalid email or password." }
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, encodeSession(record.user), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  })

  redirect(record.user.role === "admin" ? "/admin" : "/staff")
}

export async function logout() {
  "use server"

  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/login")
}
