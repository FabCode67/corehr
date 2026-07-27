import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartments } from "@/lib/api/departments"
import { fetchFormCategories } from "@/lib/api/forms"
import { createFormTemplate } from "@/lib/api/forms-actions"
import { getSession } from "@/lib/get-session"

import { TemplateForm } from "../template-form"

export default async function NewFormTemplatePage() {
  const session = await getSession()
  const [categoriesResult, departmentsResult] = await Promise.all([fetchFormCategories(), fetchDepartments()])

  if (!categoriesResult.ok) {
    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{categoriesResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/admin/forms/templates" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to templates
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New form template</h1>
        <p className="text-sm text-muted-foreground">Starts as a Draft. Add fields and signature stages next, then publish when ready to assign.</p>
      </div>

      <Card>
        <CardContent>
          <TemplateForm
            categories={categoriesResult.data}
            departments={departmentsResult.ok ? departmentsResult.data : []}
            createdById={session?.employeeId ?? ""}
            action={createFormTemplate}
            submitLabel="Create template"
          />
        </CardContent>
      </Card>
    </div>
  )
}
