import { redirect } from "next/navigation"

// The standalone Executive Summary tab was folded into HR Analytics per
// request — "keep the content only in HR Analytics" (see
// app/admin/hr-analytics/executive-summary.tsx). This route stays as a
// redirect rather than being deleted (the sandbox this file was edited in
// can't remove files on this mount), so any bookmark of the old URL still
// lands somewhere useful instead of 404ing.
export default function ExecutiveDashboardPage() {
  redirect("/admin/hr-analytics")
}
