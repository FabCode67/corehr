import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  if (!request.nextUrl.searchParams.get("actingEmployeeId")) {
    return NextResponse.json({ message: "actingEmployeeId is required" }, { status: 400 })
  }

  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/hr-analytics/export/pdf${request.nextUrl.search}`, { cache: "no-store" })

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
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="hr-analytics.pdf"`,
    },
  })
}
