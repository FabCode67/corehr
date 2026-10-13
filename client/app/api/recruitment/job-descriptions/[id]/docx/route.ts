import { NextResponse } from "next/server"

import { authHeader } from "@/lib/api/client"

/** Proxies `GET /recruitment/job-descriptions/:id/docx` (API_URL is
 *  server-only, so the browser can't download from the API directly). */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const apiBaseUrl = process.env.API_URL ?? "http://localhost:4000/api"
  const response = await fetch(`${apiBaseUrl}/recruitment/job-descriptions/${id}/docx`, {
    cache: "no-store",
    headers: await authHeader(),
  })
  if (!response.ok) {
    return NextResponse.json({ message: `${response.status} ${response.statusText}` }, { status: response.status })
  }
  return new NextResponse(await response.arrayBuffer(), {
    headers: {
      "Content-Type": response.headers.get("content-type") ?? "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": response.headers.get("content-disposition") ?? `attachment; filename="job-description.docx"`,
    },
  })
}
