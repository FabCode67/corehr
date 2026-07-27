import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { createSanctionType } from "@/lib/api/employee-relations-actions"

import { SanctionTypeForm } from "../sanction-type-form"

export default function NewSanctionTypePage() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/admin/employee-relations/sanction-types" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to sanction types
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New sanction type</h1>
      </div>

      <Card>
        <CardContent>
          <SanctionTypeForm action={createSanctionType} submitLabel="Create sanction type" />
        </CardContent>
      </Card>
    </div>
  )
}
