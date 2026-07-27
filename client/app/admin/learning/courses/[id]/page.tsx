import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBands } from "@/lib/api/bands"
import { fetchDepartments, fetchFunctions, fetchUnits } from "@/lib/api/departments"
import { fetchCourse, fetchEligibleEmployees, fetchInstitutions, fetchTrainingCategories } from "@/lib/api/learning"
import { deactivateCourse, updateCourse } from "@/lib/api/learning-actions"
import { fetchPositionLevels, fetchPositions } from "@/lib/api/positions"

import { CourseForm } from "../course-form"

export default async function EditCoursePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const [courseResult, categoriesResult, institutionsResult, functionsResult, departmentsResult, unitsResult, positionsResult, levelsResult, bandsResult, eligibleResult] =
    await Promise.all([
      fetchCourse(id),
      fetchTrainingCategories(true),
      fetchInstitutions(true),
      fetchFunctions(),
      fetchDepartments(),
      fetchUnits(),
      fetchPositions(),
      fetchPositionLevels(),
      fetchBands(),
      fetchEligibleEmployees(id),
    ])

  if (!courseResult.ok) {
    if (courseResult.status === 404) {
      notFound()
    }

    return (
      <Card className="max-w-3xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{courseResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const course = courseResult.data

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/admin/learning/courses"
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" />
            Back to course catalogue
          </Link>
          <h1 className="mt-2 text-2xl font-semibold text-foreground">
            {course.name} <span className="font-mono text-sm text-muted-foreground">({course.courseCode})</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Badge variant={course.isActive ? "success" : "outline"}>{course.isActive ? "Active" : "Inactive"}</Badge>
          {course.isActive ? (
            <form action={deactivateCourse.bind(null, course.id)}>
              <button type="submit" className="text-xs font-medium text-destructive hover:underline">
                Deactivate
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {categoriesResult.ok ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <CourseForm
              course={course}
              categories={categoriesResult.data}
              institutions={institutionsResult.ok ? institutionsResult.data : []}
              functions={functionsResult.ok ? functionsResult.data : []}
              departments={departmentsResult.ok ? departmentsResult.data : []}
              units={unitsResult.ok ? unitsResult.data : []}
              positions={positionsResult.ok ? positionsResult.data : []}
              levels={levelsResult.ok ? levelsResult.data : []}
              bands={bandsResult.ok ? bandsResult.data : []}
              action={updateCourse.bind(null, course.id)}
              submitLabel="Save changes"
            />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Eligible employees</CardTitle>
          <CardDescription>
            Every active employee who currently satisfies this course&apos;s eligibility restrictions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!eligibleResult.ok ? (
            <p className="text-sm text-destructive">{eligibleResult.error}</p>
          ) : eligibleResult.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No employees currently match this course&apos;s restrictions.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
              {eligibleResult.data.map((employee) => (
                <li key={employee.employeeNumber} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span className="font-medium text-foreground">
                    {employee.firstName} {employee.lastName}
                  </span>
                  <span className="text-xs text-muted-foreground">{employee.employeeNumber}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
