import { NextRequest, NextResponse } from "next/server"

/** Proxies to `GET /employees`, forwarding the query string as-is (page,
 *  pageSize, branchId, search, includeInactive) — API_URL is server-only, so
 *  a client component (e.g. the Locations map's "View employees" popup, which
 *  fetches on-demand inside a useEffect rather than at server-render time)
 *  can't call the NestJS API directly from the browser. Same shape as
 *  app/api/employees/export/route.ts, but returns JSON instead of a file. */
export async function GET(request: NextRequest) {
  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/employees${request.nextUrl.search}`, { cache: "no-store" })

  let body: unknown = null
  try {
    body = await response.json()
  } catch {
    // Non-JSON response — fall through with a generic message below.
  }

  if (!response.ok) {
    const message =
      body && typeof body === "object" && "message" in body
        ? Array.isArray((body as { message: unknown }).message)
          ? ((body as { message: string[] }).message.join(", "))
          : (body as { message: string }).message
        : `${response.status} ${response.statusText}`
    return NextResponse.json({ message }, { status: response.status })
  }

  return NextResponse.json(body)
}
