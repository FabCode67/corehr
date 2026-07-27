import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployees } from "@/lib/api/employees"
import { fetchFormTemplate, type FormStatus } from "@/lib/api/forms"

import { FieldList } from "./field-list"
import { StageList } from "./stage-list"
import { TemplateActions } from "./template-actions"

const STATUS_VARIANT: Record<FormStatus, "outline" | "success" | "secondary"> = {
  DRAFT: "outline",
  ACTIVE: "success",
  ARCHIVED: "secondary",
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

export default async function FormTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [templateResult, employeesResult] = await Promise.all([fetchFormTemplate(id), fetchEmployees()])

  if (!templateResult.ok) {
    if (templateResult.status === 404) notFound()
    return (
      <Card className="max-w-4xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{templateResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const template = templateResult.data
  const employees = employeesResult.ok ? employeesResult.data : []
  // A DRAFT template never has instances yet (assign() requires ACTIVE), so
  // it's always safe to edit structurally. Once published, this UI treats
  // it as locked — use "Create new version" for further changes, matching
  // FormTemplatesService.assertStructurallyEditable's intent without an
  // extra instance-count round trip just to decide a button's visibility.
  const editable = template.status === "DRAFT"

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/admin/forms/templates" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to templates
        </Link>
        <div className="mt-2 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-foreground">{template.title}</h1>
          <Badge variant={STATUS_VARIANT[template.status]}>{template.status}</Badge>
        </div>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="text-base">Details</CardTitle>
          {editable ? (
            <Link href={`/admin/forms/templates/${template.id}/edit`} className={buttonVariants({ size: "sm", variant: "outline" })}>
              Edit basic info
            </Link>
          ) : null}
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Form code" value={`${template.formCode} (v${template.version})`} />
          <Field label="Category" value={template.category.name} />
          <Field label="Description" value={template.description} />
          <Field label="Purpose" value={template.purpose ?? "—"} />
          <Field label="Applicable department" value={template.applicableDepartment?.name ?? "All departments"} />
          <Field label="Applicable employee category" value={template.applicableEmployeeCategory ?? "—"} />
          <Field label="Created by" value={`${template.createdBy.firstName} ${template.createdBy.lastName}`} />
          {template.requirementsInstructions ? <Field label="Requirements / instructions" value={template.requirementsInstructions} /> : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <TemplateActions templateId={template.id} status={template.status} hasInstances={!editable} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fields</CardTitle>
          <CardDescription>The fields an employee fills in when completing this form.</CardDescription>
        </CardHeader>
        <CardContent>
          <FieldList templateId={template.id} fields={template.fields} editable={editable} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signature stages</CardTitle>
          <CardDescription>
            Ordered approval chain. Stages sharing the same order sign in parallel; a stage becomes actionable once every earlier stage is fully signed.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StageList templateId={template.id} stages={template.signatureStages} employees={employees} editable={editable} />
        </CardContent>
      </Card>
    </div>
  )
}
