import { NextRequest, NextResponse } from "next/server"

/**
 * Proxies to the NestJS `GET /employee-relations/cases/:id/pdf` endpoint —
 * same reasoning as app/api/forms/instances/[id]/pdf/route.ts: API_URL is a
 * server-only env var, so a browser-clickable download link has to go
 * through this app's own route instead of hitting the API directly.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actingEmployeeId = request.nextUrl.searchParams.get("actingEmployeeId")
  if (!actingEmployeeId) {
    return NextResponse.json({ message: "actingEmployeeId is required" }, { status: 400 })
  }

  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/employee-relations/cases/${id}/pdf?actingEmployeeId=${encodeURIComponent(actingEmployeeId)}`, {
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
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="case-${id}.pdf"`,
    },
  })
}
