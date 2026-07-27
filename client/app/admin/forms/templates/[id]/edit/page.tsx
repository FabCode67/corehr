import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartments } from "@/lib/api/departments"
import { fetchFormCategories, fetchFormTemplate } from "@/lib/api/forms"
import { updateFormTemplate } from "@/lib/api/forms-actions"

import { TemplateForm } from "../../template-form"

export default async function EditFormTemplatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [templateResult, categoriesResult, departmentsResult] = await Promise.all([
    fetchFormTemplate(id),
    fetchFormCategories(true),
    fetchDepartments(),
  ])

  if (!templateResult.ok) {
    if (templateResult.status === 404) notFound()
    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{templateResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const template = templateResult.data

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href={`/admin/forms/templates/${id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to {template.title}
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Edit basic info</h1>
      </div>

      <Card>
        <CardContent>
          <TemplateForm
            template={template}
            categories={categoriesResult.ok ? categoriesResult.data : []}
            departments={departmentsResult.ok ? departmentsResult.data : []}
            action={updateFormTemplate.bind(null, template.id)}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </div>
  )
}
