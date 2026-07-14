"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import { loginRequest } from "@/lib/api/auth"
import { ApiError } from "@/lib/api/client"
import { formatEnumLabel } from "@/lib/api/employees"
import { encodeSession, SESSION_COOKIE, type SessionUser } from "@/lib/session"

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

  if (!email || !password) {
    return { error: "Email and password are required." }
  }

  let employee
  try {
    employee = await loginRequest(email, password)
  } catch (error) {
    return {
      error:
        error instanceof ApiError
          ? error.message
          : "Could not reach the server. Please try again.",
    }
  }

  const sessionUser: SessionUser = {
    id: employee.id,
    employeeId: employee.id,
    name: `${employee.firstName} ${employee.lastName}`,
    email: employee.email,
    role: employee.isAdmin ? "admin" : "staff",
    jobTitle: employee.position?.title ?? "Not yet assigned",
    department: employee.position?.department.name ?? "Not yet assigned",
    branch: formatEnumLabel(employee.workLocation),
  }

  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, encodeSession(sessionUser), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 hours
  })

  redirect(sessionUser.role === "admin" ? "/admin" : "/staff")
}

export async function logout() {
  "use server"

  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE)
  redirect("/login")
}
