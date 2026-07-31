import { notFound } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmailTemplate } from "@/lib/api/email"

import { EditTemplateForm } from "./edit-template-form"

export default async function EmailTemplateDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await fetchEmailTemplate(id)

  if (!result.ok) {
    if (result.status === 404) notFound()
    return (
      <Card className="border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const template = result.data

  return (
    <div className="flex flex-col gap-6">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{template.name}</h1>
          {template.isMandatory ? <Badge variant="secondary">Mandatory</Badge> : null}
        </div>
        <p className="text-sm font-mono text-xs text-muted-foreground">{template.key}</p>
      </div>

      {template.variables.length > 0 ? (
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="text-sm">Available variables</CardTitle>
            <CardDescription>
              Use these inside the subject or body as <code>{"{{variable_name}}"}</code>.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {template.variables.map((variable) => (
              <Badge key={variable} variant="outline" className="font-mono">
                {`{{${variable}}}`}
              </Badge>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <EditTemplateForm template={template} />
    </div>
  )
}
