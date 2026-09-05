import { NextRequest, NextResponse } from "next/server"

/**
 * Proxies to `GET /employees/:id/family-tree/export` (single-employee
 * Family Tree Report) — API_URL is server-only, so a browser download link
 * has to go through this app's own route. Same pattern as
 * app/api/employee-relations/cases/[id]/pdf/route.ts.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/employees/${id}/family-tree/export${request.nextUrl.search}`, {
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
      "Content-Type": response.headers.get("content-type") ?? "application/pdf",
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="family-tree-${id}.pdf"`,
    },
  })
}
