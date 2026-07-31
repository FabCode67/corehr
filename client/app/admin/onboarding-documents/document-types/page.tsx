import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { deleteDocumentTypeForm } from "@/lib/api/onboarding-documents-actions"
import { DOCUMENT_CATEGORY_LABELS, fetchDocumentTypes } from "@/lib/api/onboarding-documents"

import { OnboardingDocumentsTabs } from "../onboarding-documents-tabs"

export default async function DocumentTypesPage() {
  const result = await fetchDocumentTypes(true)

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Onboarding Documents</h1>
          <p className="text-sm text-muted-foreground">
            Document requirements available when assigning onboarding documents to a new employee — HR can add more here without any code changes.
          </p>
        </div>
        <Link href="/admin/onboarding-documents/document-types/new" className={buttonVariants({ size: "sm" })}>
          New document type
        </Link>
      </div>

      <OnboardingDocumentsTabs />

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Mandatory</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {result.data.map((documentType) => (
                  <tr key={documentType.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{documentType.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">{DOCUMENT_CATEGORY_LABELS[documentType.category]}</td>
                    <td className="px-4 py-3">
                      <Badge variant={documentType.isMandatory ? "secondary" : "outline"}>{documentType.isMandatory ? "Mandatory" : "Optional"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={documentType.isActive ? "success" : "outline"}>{documentType.isActive ? "Active" : "Inactive"}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link href={`/admin/onboarding-documents/document-types/${documentType.id}`} className="text-xs font-medium text-primary hover:underline">
                          Edit
                        </Link>
                        {documentType.isActive ? (
                          <form action={deleteDocumentTypeForm.bind(null, documentType.id)}>
                            <button type="submit" className="text-xs font-medium text-destructive hover:underline">
                              Deactivate
                            </button>
                          </form>
                        ) : null}
                      </div>
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
