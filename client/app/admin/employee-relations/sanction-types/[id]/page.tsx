import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchSanctionType } from "@/lib/api/employee-relations"
import { updateSanctionType } from "@/lib/api/employee-relations-actions"

import { SanctionTypeForm } from "../sanction-type-form"

export default async function EditSanctionTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await fetchSanctionType(id)

  if (!result.ok) {
    if (result.status === 404) notFound()
    return (
      <Card className="max-w-xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const sanctionType = result.data

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/admin/employee-relations/sanction-types" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to sanction types
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{sanctionType.name}</h1>
      </div>

      <Card>
        <CardContent>
          <SanctionTypeForm sanctionType={sanctionType} action={updateSanctionType.bind(null, sanctionType.id)} submitLabel="Save changes" />
        </CardContent>
      </Card>
    </div>
  )
}
