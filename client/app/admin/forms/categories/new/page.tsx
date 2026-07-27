import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { createFormCategory } from "@/lib/api/forms-actions"

import { CategoryForm } from "../category-form"

export default function NewFormCategoryPage() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/admin/forms/categories" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to categories
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New form category</h1>
      </div>

      <Card>
        <CardContent>
          <CategoryForm action={createFormCategory} submitLabel="Create category" />
        </CardContent>
      </Card>
    </div>
  )
}
