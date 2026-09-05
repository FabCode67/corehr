import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployees } from "@/lib/api/employees"

import { AdminAccessManager } from "./admin-access-manager"

export default async function AdminSettingsPage() {
  const employeesResult = await fetchEmployees(false)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Roles &amp; permissions, approval workflow configuration, form builder, and salary grade references.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Admin Access</CardTitle>
          <CardDescription>
            Admin Portal access is automatic: every active employee in the Human Resources department has it,
            except the Managing Director. There&apos;s nothing to grant or revoke here — moving someone into or
            out of HR (via Position Assignment or Transfer) updates this immediately. Admins keep full access to
            their own Staff Portal too — use the “My Profile Portal” switch at the top of the sidebar.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {employeesResult.ok ? (
            <AdminAccessManager employees={employeesResult.data} />
          ) : (
            <p className="text-sm text-destructive">{employeesResult.error}</p>
          )}
        </CardContent>
      </Card>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base text-muted-foreground">More settings — coming soon</CardTitle>
          <CardDescription>Approval workflow configuration, form builder, and salary grade references.</CardDescription>
        </CardHeader>
      </Card>
    </div>
  )
}
