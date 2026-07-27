import { getSession } from "@/lib/get-session"

import { CaseDetail } from "./case-detail"

export default async function DisciplinaryCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()

  return (
    <CaseDetail
      id={id}
      actingEmployeeId={session?.employeeId ?? ""}
      isHr={session?.role === "admin"}
      backHref="/admin/employee-relations/cases"
      backLabel="Back to disciplinary cases"
    />
  )
}
