import { NextRequest, NextResponse } from "next/server"

/** Proxies to `GET /hr-analytics/export/xlsx`, forwarding every filter in
 *  the query string (not just actingEmployeeId) — same reasoning as
 *  app/api/executive-dashboard/pdf/route.ts: API_URL is server-only, so a
 *  browser download link can't hit the API directly. */
export async function GET(request: NextRequest) {
  if (!request.nextUrl.searchParams.get("actingEmployeeId")) {
    return NextResponse.json({ message: "actingEmployeeId is required" }, { status: 400 })
  }

  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/hr-analytics/export/xlsx${request.nextUrl.search}`, { cache: "no-store" })

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
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="hr-analytics.xlsx"`,
    },
  })
}
