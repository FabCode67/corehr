import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { fetchEmployees } from "@/lib/api/employees"
import { getSession } from "@/lib/get-session"

import { CaseForm } from "../case-form"

export default async function NewDisciplinaryCasePage() {
  const session = await getSession()
  const employeesResult = await fetchEmployees()

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/admin/employee-relations/cases" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to disciplinary cases
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New disciplinary case</h1>
        <p className="text-sm text-muted-foreground">The case is created as a draft — submit it once it&apos;s ready to move HR&apos;s pipeline forward.</p>
      </div>

      <Card>
        <CardContent>
          <CaseForm employees={employeesResult.ok ? employeesResult.data : []} reportedById={session?.employeeId ?? ""} />
        </CardContent>
      </Card>
    </div>
  )
}
