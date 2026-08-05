import { NextRequest, NextResponse } from "next/server"

/** Proxies to `GET /hr-analytics/export/custom`, forwarding every query
 *  param (filters, `sections`, `format`) — same reasoning as the other
 *  hr-analytics export routes: API_URL is server-only, so a browser
 *  download link can't hit the API directly. Content-Type is picked from
 *  the `format` param since this one route serves both xlsx and pptx. */
export async function GET(request: NextRequest) {
  if (!request.nextUrl.searchParams.get("actingEmployeeId")) {
    return NextResponse.json({ message: "actingEmployeeId is required" }, { status: 400 })
  }

  const format = request.nextUrl.searchParams.get("format") === "pptx" ? "pptx" : "xlsx"
  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/hr-analytics/export/custom${request.nextUrl.search}`, { cache: "no-store" })

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
  const contentType =
    format === "pptx" ? "application/vnd.openxmlformats-officedocument.presentationml.presentation" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": contentType,
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="custom-hr-report.${format}"`,
    },
  })
}
