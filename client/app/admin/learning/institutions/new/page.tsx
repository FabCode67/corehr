import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { createInstitution } from "@/lib/api/learning-actions"

import { InstitutionForm } from "../institution-form"

export default function NewInstitutionPage() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link
          href="/admin/learning/institutions"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to institutions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New institution</h1>
      </div>

      <Card>
        <CardContent>
          <InstitutionForm action={createInstitution} submitLabel="Create institution" />
        </CardContent>
      </Card>
    </div>
  )
}
