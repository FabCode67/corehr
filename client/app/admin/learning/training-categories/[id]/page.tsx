import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchTrainingCategory } from "@/lib/api/learning"
import { updateTrainingCategory } from "@/lib/api/learning-actions"

import { TrainingCategoryForm } from "../training-category-form"

export default async function EditTrainingCategoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await fetchTrainingCategory(id)

  if (!result.ok) {
    if (result.status === 404) {
      notFound()
    }

    return (
      <Card className="max-w-xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{result.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const category = result.data

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link
          href="/admin/learning/training-categories"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to training categories
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{category.name}</h1>
      </div>

      <Card>
        <CardContent>
          <TrainingCategoryForm
            category={category}
            action={updateTrainingCategory.bind(null, category.id)}
            submitLabel="Save changes"
          />
        </CardContent>
      </Card>
    </div>
  )
}
