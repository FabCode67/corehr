import { NextRequest, NextResponse } from "next/server"

/** Proxies to `GET /department-dashboard/:departmentId/leave-plan/template`
 *  — API_URL is server-only, so a browser download link can't hit the API
 *  directly. Same pattern as the employees export proxy route. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ departmentId: string }> }) {
  const { departmentId } = await params
  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/department-dashboard/${departmentId}/leave-plan/template${request.nextUrl.search}`, {
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
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="annual-leave-plan-template.xlsx"`,
    },
  })
}
