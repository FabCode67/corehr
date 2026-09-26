import { NextRequest, NextResponse } from "next/server"

import { authHeader } from "@/lib/api/client"

/** Proxies to `GET /leave/annual-plan/export` — HR's bank-wide (or
 *  department-filtered) Annual Leave Plan export. API_URL is server-only,
 *  so a browser download link can't hit the API directly. */
export async function GET(request: NextRequest) {
  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/leave/annual-plan/export${request.nextUrl.search}`, {
    cache: "no-store",
    headers: await authHeader(),
  })

  if (!response.ok) {
    let message = `${response.status} ${response.statusText}`
    try {
      const body = (await response.json()) as { message?: string | string[] }
      if (body?.message) message = Array.isArray(body.message) ? body.message.join(", ") : body.message
    } catch {
      // Response wasn't JSON — fall back to the status text above.
    }
    return NextResponse.json({ message }, { status: response.status })
  }

  const buffer = await response.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="annual-leave-plan.xlsx"`,
    },
  })
}
