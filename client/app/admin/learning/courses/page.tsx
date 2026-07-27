import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchCourses, DELIVERY_METHOD_LABELS } from "@/lib/api/learning"

import { LearningTabs } from "../learning-tabs"

export default async function CoursesPage() {
  const result = await fetchCourses({ includeInactive: true })
  const courses = result.ok ? [...result.data].sort((a, b) => a.name.localeCompare(b.name)) : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Learning & Development</h1>
          <p className="text-sm text-muted-foreground">
            The full course catalogue — mandatory compliance and professional development courses.
          </p>
        </div>
        <Link href="/admin/learning/courses/new" className={buttonVariants({ size: "sm" })}>
          New course
        </Link>
      </div>

      <LearningTabs />

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : courses.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No courses yet.{" "}
            <Link href="/admin/learning/courses/new" className="text-primary underline">
              Add the first one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Code</th>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Category</th>
                  <th className="px-4 py-3 font-medium">Institution</th>
                  <th className="px-4 py-3 font-medium">Delivery</th>
                  <th className="px-4 py-3 font-medium">Cost</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {courses.map((course) => (
                  <tr key={course.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{course.courseCode}</td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-foreground">{course.name}</p>
                      {course.autoAssignOnHire ? (
                        <p className="text-xs text-muted-foreground">
                          Auto-assigned on hire — due {course.autoAssignDueMonths ?? 12} months after start
                        </p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={course.category.isMandatory ? "destructive" : "outline"}>
                        {course.category.name}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{course.institution?.name ?? "—"}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {DELIVERY_METHOD_LABELS[course.deliveryMethod]}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {course.cost != null ? `RWF ${course.cost.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={course.isActive ? "success" : "outline"}>
                        {course.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-3">
                        <Link
                          href={`/admin/learning/courses/${course.id}`}
                          className="text-xs font-medium text-primary hover:underline"
                        >
                          Manage
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
