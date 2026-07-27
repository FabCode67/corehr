import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployees } from "@/lib/api/employees"
import { fetchFormTemplates } from "@/lib/api/forms"
import { getSession } from "@/lib/get-session"

import { AssignForm } from "../assign-form"

export default async function AssignFormPage() {
  const session = await getSession()
  const [templatesResult, employeesResult] = await Promise.all([fetchFormTemplates({ status: "ACTIVE" }), fetchEmployees()])

  if (!templatesResult.ok) {
    return (
      <Card className="max-w-xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{templatesResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/admin/forms/assigned" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to assigned forms
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Assign a form</h1>
      </div>

      {templatesResult.data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No published (Active) templates yet.{" "}
            <Link href="/admin/forms/templates/new" className="text-primary underline">
              Create and publish one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <AssignForm
              templates={templatesResult.data}
              employees={employeesResult.ok ? employeesResult.data : []}
              assignedById={session?.employeeId ?? ""}
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
