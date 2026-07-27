import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployees } from "@/lib/api/employees"
import { fetchCourses } from "@/lib/api/learning"
import { getSession } from "@/lib/get-session"

import { AssignForm } from "./assign-form"

export default async function NewAssignmentPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""

  const [employeesResult, coursesResult] = await Promise.all([
    fetchEmployees(false),
    fetchCourses(),
  ])

  if (!employeesResult.ok) {
    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{employeesResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }
  if (!coursesResult.ok) {
    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{coursesResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/admin/learning/assignments"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to assigned courses
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Assign a course</h1>
      </div>

      <Card>
        <CardContent>
          <AssignForm employees={employeesResult.data} courses={coursesResult.data} actingEmployeeId={actingEmployeeId} />
        </CardContent>
      </Card>
    </div>
  )
}
