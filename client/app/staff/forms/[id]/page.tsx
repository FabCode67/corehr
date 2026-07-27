import { InstanceDetail } from "@/app/admin/forms/instances/[id]/instance-detail"
import { getSession } from "@/lib/get-session"

export default async function StaffFormInstanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  return <InstanceDetail id={id} actingEmployeeId={session?.employeeId ?? ""} backHref="/staff/forms" backLabel="Back to Forms & Requests" />
}
