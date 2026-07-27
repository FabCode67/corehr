import { NextRequest, NextResponse } from "next/server"

/**
 * Proxies to the NestJS `GET /forms/instances/:id/pdf` endpoint. A browser
 * download link can't hit the API directly — API_URL is a server-only env
 * var, deliberately not exposed as NEXT_PUBLIC_API_URL (see the note in
 * lib/org-chart.ts) — so this route runs server-side, forwards the request,
 * and streams the PDF bytes + headers straight back to the browser.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const actingEmployeeId = request.nextUrl.searchParams.get("actingEmployeeId")
  if (!actingEmployeeId) {
    return NextResponse.json({ message: "actingEmployeeId is required" }, { status: 400 })
  }

  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/forms/instances/${id}/pdf?actingEmployeeId=${encodeURIComponent(actingEmployeeId)}`, {
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
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="form-${id}.pdf"`,
    },
  })
}
