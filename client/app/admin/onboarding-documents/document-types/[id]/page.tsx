import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBands } from "@/lib/api/bands"
import { fetchDepartments, fetchFunctions } from "@/lib/api/departments"
import { fetchDocumentType } from "@/lib/api/onboarding-documents"
import { updateDocumentType } from "@/lib/api/onboarding-documents-actions"
import { fetchPositions } from "@/lib/api/positions"

import { DocumentTypeForm } from "../document-type-form"

export default async function EditDocumentTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [result, functionsResult, departmentsResult, positionsResult, bandsResult] = await Promise.all([
    fetchDocumentType(id),
    fetchFunctions(),
    fetchDepartments(),
    fetchPositions(),
    fetchBands(),
  ])

  if (!result.ok) {
    if (result.status === 404) notFound()
    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const documentType = result.data

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/admin/onboarding-documents/document-types" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to document types
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{documentType.name}</h1>
      </div>

      <Card>
        <CardContent>
          <DocumentTypeForm
            documentType={documentType}
            functions={functionsResult.ok ? functionsResult.data.filter((f) => f.isActive) : []}
            departments={departmentsResult.ok ? departmentsResult.data.filter((d) => d.isActive) : []}
            positions={positionsResult.ok ? positionsResult.data.filter((p) => p.isActive) : []}
            bands={bandsResult.ok ? bandsResult.data.filter((b) => b.isActive) : []}
            action={updateDocumentType.bind(null, documentType.id)}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </div>
  )
}
