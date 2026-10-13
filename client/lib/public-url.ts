import { headers } from "next/headers"

/** Public origin of this app, for building shareable links. NEXT_PUBLIC_APP_URL
 *  wins when set; otherwise derived from the incoming request. */
export async function getPublicBaseUrl(): Promise<string> {
  const configured = process.env.NEXT_PUBLIC_APP_URL
  if (configured) return configured.replace(/\/$/, "")
  const h = await headers()
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000"
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https")
  return `${proto}://${host}`
}
