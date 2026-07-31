import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { fetchBands } from "@/lib/api/bands"
import { fetchDepartments, fetchFunctions } from "@/lib/api/departments"
import { createDocumentType } from "@/lib/api/onboarding-documents-actions"
import { fetchPositions } from "@/lib/api/positions"

import { DocumentTypeForm } from "../document-type-form"

export default async function NewDocumentTypePage() {
  const [functionsResult, departmentsResult, positionsResult, bandsResult] = await Promise.all([
    fetchFunctions(),
    fetchDepartments(),
    fetchPositions(),
    fetchBands(),
  ])

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link href="/admin/onboarding-documents/document-types" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to document types
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New onboarding document type</h1>
      </div>

      <Card>
        <CardContent>
          <DocumentTypeForm
            functions={functionsResult.ok ? functionsResult.data.filter((f) => f.isActive) : []}
            departments={departmentsResult.ok ? departmentsResult.data.filter((d) => d.isActive) : []}
            positions={positionsResult.ok ? positionsResult.data.filter((p) => p.isActive) : []}
            bands={bandsResult.ok ? bandsResult.data.filter((b) => b.isActive) : []}
            action={createDocumentType}
            submitLabel="Create document type"
          />
        </CardContent>
      </Card>
    </div>
  )
}
