import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBands } from "@/lib/api/bands"
import { fetchDepartments, fetchFunctions, fetchUnits } from "@/lib/api/departments"
import { fetchInstitutions, fetchTrainingCategories } from "@/lib/api/learning"
import { createCourse } from "@/lib/api/learning-actions"
import { fetchPositionLevels, fetchPositions } from "@/lib/api/positions"

import { CourseForm } from "../course-form"

export default async function NewCoursePage() {
  const [categoriesResult, institutionsResult, functionsResult, departmentsResult, unitsResult, positionsResult, levelsResult, bandsResult] =
    await Promise.all([
      fetchTrainingCategories(true),
      fetchInstitutions(true),
      fetchFunctions(),
      fetchDepartments(),
      fetchUnits(),
      fetchPositions(),
      fetchPositionLevels(),
      fetchBands(),
    ])

  if (!categoriesResult.ok) {
    return (
      <Card className="max-w-3xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{categoriesResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin/learning/courses"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to course catalogue
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New course</h1>
      </div>

      <Card>
        <CardContent>
          <CourseForm
            categories={categoriesResult.data}
            institutions={institutionsResult.ok ? institutionsResult.data : []}
            functions={functionsResult.ok ? functionsResult.data : []}
            departments={departmentsResult.ok ? departmentsResult.data : []}
            units={unitsResult.ok ? unitsResult.data : []}
            positions={positionsResult.ok ? positionsResult.data : []}
            levels={levelsResult.ok ? levelsResult.data : []}
            bands={bandsResult.ok ? bandsResult.data : []}
            action={createCourse}
            submitLabel="Create course"
          />
        </CardContent>
      </Card>
    </div>
  )
}
