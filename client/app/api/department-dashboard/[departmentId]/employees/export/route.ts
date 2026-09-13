import { NextRequest, NextResponse } from "next/server"

/** Proxies to `GET /department-dashboard/:departmentId/employees/export`,
 *  forwarding the column list and actingEmployeeId in the query string —
 *  API_URL is server-only, so a browser download link can't hit the API
 *  directly. Same pattern as app/api/employees/export/route.ts. */
export async function GET(request: NextRequest, { params }: { params: Promise<{ departmentId: string }> }) {
  const { departmentId } = await params
  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/department-dashboard/${departmentId}/employees/export${request.nextUrl.search}`, {
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

  const isCsv = request.nextUrl.searchParams.get("format") === "csv"
  const buffer = await response.arrayBuffer()
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? (isCsv ? "text/csv" : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"),
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="department-employees.${isCsv ? "csv" : "xlsx"}"`,
    },
  })
}
