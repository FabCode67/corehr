import { getSession } from "@/lib/get-session"

import { InstanceDetail } from "./instance-detail"

export default async function FormInstanceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  return <InstanceDetail id={id} actingEmployeeId={session?.employeeId ?? ""} backHref="/admin/forms/assigned" backLabel="Back to assigned forms" />
}
