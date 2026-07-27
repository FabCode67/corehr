import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { createTrainingCategory } from "@/lib/api/learning-actions"

import { TrainingCategoryForm } from "../training-category-form"

export default function NewTrainingCategoryPage() {
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
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New training category</h1>
      </div>

      <Card>
        <CardContent>
          <TrainingCategoryForm action={createTrainingCategory} submitLabel="Create category" />
        </CardContent>
      </Card>
    </div>
  )
}
