import { EmployeeProfile } from "@/components/account/employee-profile"
import { getSession } from "@/lib/get-session"

export default async function AdminProfilePage() {
  const session = await getSession()

  if (!session) {
    return null // middleware already guards this route; defensive only
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">My Profile</h1>
        <p className="text-sm text-muted-foreground">
          Your employment details and account security.
        </p>
      </div>

      <EmployeeProfile employeeId={session.employeeId} />
    </div>
  )
}
