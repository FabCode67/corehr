import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmailTemplates } from "@/lib/api/email"

const CATEGORY_LABELS: Record<string, string> = {
  onboarding: "Onboarding",
  leave: "Leave",
  performance: "Performance",
  learning: "Learning & Development",
  recruitment: "Recruitment",
  exit: "Exit Management",
  approval: "Approvals",
}

export default async function EmailTemplatesPage() {
  const result = await fetchEmailTemplates()

  if (!result.ok) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-2xl font-semibold text-foreground">Email Templates</h1>
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  const byCategory = new Map<string, typeof result.data>()
  for (const template of result.data) {
    const list = byCategory.get(template.category) ?? []
    list.push(template)
    byCategory.set(template.category, list)
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Email Templates</h1>
        <p className="text-sm text-muted-foreground">
          {result.data.length} template{result.data.length === 1 ? "" : "s"} across {byCategory.size} categories.
          Mandatory templates (marked below) can&apos;t be disabled by employees via notification preferences.
        </p>
      </div>

      {Array.from(byCategory.entries()).map(([category, templates]) => (
        <div key={category} className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-foreground">{CATEGORY_LABELS[category] ?? category}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Link key={template.id} href={`/admin/email/templates/${template.id}`}>
                <Card className="h-full transition-colors hover:border-primary/50">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="text-sm">{template.name}</CardTitle>
                      <div className="flex shrink-0 gap-1">
                        {template.isMandatory ? <Badge variant="secondary">Mandatory</Badge> : null}
                        <Badge variant={template.isActive ? "success" : "outline"}>
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                    </div>
                    <CardDescription className="line-clamp-2">{template.subject}</CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
