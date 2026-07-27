import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchFormTemplates, type FormStatus } from "@/lib/api/forms"

import { FormsTabs } from "../forms-tabs"

const STATUS_VARIANT: Record<FormStatus, "outline" | "success" | "secondary"> = {
  DRAFT: "outline",
  ACTIVE: "success",
  ARCHIVED: "secondary",
}

export default async function FormTemplatesPage() {
  const result = await fetchFormTemplates()

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Forms Management</h1>
          <p className="text-sm text-muted-foreground">Form templates — build fields and a signature routing chain, then publish to make them assignable.</p>
        </div>
        <Link href="/admin/forms/templates/new" className={buttonVariants({ size: "sm" })}>
          New template
        </Link>
      </div>

      <FormsTabs />

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : result.data.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No form templates yet.{" "}
            <Link href="/admin/forms/templates/new" className="text-primary underline">
              Create the first one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Version</th>
                  <th className="px-4 py-3 font-medium">Fields</th>
                  <th className="px-4 py-3 font-medium">Signature stages</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.map((template) => (
                  <tr key={template.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{template.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{template.formCode}</td>
                    <td className="px-4 py-3 text-muted-foreground">{template.category.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">v{template.version}</td>
                    <td className="px-4 py-3 text-muted-foreground">{template.fields.length}</td>
                    <td className="px-4 py-3 text-muted-foreground">{template.signatureStages.length}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[template.status]}>{template.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/forms/templates/${template.id}`} className="text-xs font-medium text-primary hover:underline">
                        Open
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
