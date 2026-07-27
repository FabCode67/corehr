import { getSession } from "@/lib/get-session"

import { CaseDetail } from "@/app/admin/employee-relations/cases/[id]/case-detail"

export default async function StaffDisciplinaryCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  return (
    <CaseDetail
      id={id}
      actingEmployeeId={session?.employeeId ?? ""}
      isHr={false}
      backHref="/staff/employee-relations"
      backLabel="Back to Employee Relations"
    />
  )
}
