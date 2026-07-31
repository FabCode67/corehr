import { NextRequest, NextResponse } from "next/server"

/** Proxies to `GET /imports/:module/template` — same reasoning as every
 *  other download proxy route in this app (API_URL is server-only). */
export async function GET(request: NextRequest, { params }: { params: Promise<{ module: string }> }) {
  const { module } = await params
  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/imports/${module}/template`, { cache: "no-store" })

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
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="${module}-import-template.xlsx"`,
    },
  })
}
