import { redirect } from "next/navigation"

// The standalone Overview tab (KPI cards + training banner) was folded into
// HR Analytics per request — "keep the content only in HR Analytics." This
// route stays as a redirect rather than being deleted outright, since the
// Dashboard nav entry, the post-login redirect in app/login/actions.ts, and
// anyone's existing bookmark all still point at plain "/admin".
export default function AdminDashboardPage() {
  redirect("/admin/hr-analytics")
}
