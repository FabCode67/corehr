/**
 * Base URL of the Next.js client — used everywhere an outgoing email needs
 * to link back into the app (e.g. "Log in", "Review request"). Falls back
 * to the first CORS_ORIGIN entry (already required for the API to accept
 * the client's requests at all) so most deployments don't need to set yet
 * another env var, then to localhost for local dev.
 */
export function getClientBaseUrl(): string {
  const raw = process.env.CLIENT_APP_URL ?? process.env.CORS_ORIGIN ?? "http://localhost:3000"
  return raw.split(",")[0].trim().replace(/\/$/, "")
}

export function buildClientUrl(path: string): string {
  return `${getClientBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`
}
