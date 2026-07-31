import { NextRequest, NextResponse } from "next/server"

/**
 * Proxies to the NestJS `GET /executive-dashboard/pdf` endpoint. Same
 * reasoning as app/api/forms/instances/[id]/pdf/route.ts: API_URL is a
 * server-only env var, so a browser download link can't hit the API
 * directly — this route runs server-side and streams the PDF back.
 */
export async function GET(request: NextRequest) {
  const actingEmployeeId = request.nextUrl.searchParams.get("actingEmployeeId")
  if (!actingEmployeeId) {
    return NextResponse.json({ message: "actingEmployeeId is required" }, { status: 400 })
  }

  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/executive-dashboard/pdf?actingEmployeeId=${encodeURIComponent(actingEmployeeId)}`, {
    cache: "no-store",
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
      "Content-Type": "application/pdf",
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="executive-dashboard.pdf"`,
    },
  })
}
