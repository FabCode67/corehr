import { NextRequest, NextResponse } from "next/server"

import { decodeSession, SESSION_COOKIE } from "@/lib/session"

const STAFF_PREFIX = "/staff"
const ADMIN_PREFIX = "/admin"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isStaffRoute = pathname.startsWith(STAFF_PREFIX)
  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX)

  if (!isStaffRoute && !isAdminRoute) {
    return NextResponse.next()
  }

  const session = decodeSession(request.cookies.get(SESSION_COOKIE)?.value)

  if (!session) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Staff cannot reach the admin portal. Admins are allowed into the staff
  // portal too, since every admin is also an employee with their own profile.
  if (isAdminRoute && session.role !== "admin") {
    return NextResponse.redirect(new URL("/staff", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/staff/:path*", "/admin/:path*"],
}
