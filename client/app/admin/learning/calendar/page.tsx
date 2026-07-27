import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchCourses, DELIVERY_METHOD_LABELS } from "@/lib/api/learning"

import { LearningTabs } from "../learning-tabs"

function monthLabel(date: Date) {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" })
}

export default async function TrainingCalendarPage() {
  const result = await fetchCourses({ includeInactive: false })
  const scheduled = result.ok
    ? result.data.filter((course) => course.startDate).sort((a, b) => a.startDate!.localeCompare(b.startDate!))
    : []

  const byMonth = new Map<string, typeof scheduled>()
  for (const course of scheduled) {
    const key = monthLabel(new Date(course.startDate!))
    byMonth.set(key, [...(byMonth.get(key) ?? []), course])
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Learning & Development</h1>
        <p className="text-sm text-muted-foreground">
          Upcoming and scheduled training sessions, grouped by month.
        </p>
      </div>

      <LearningTabs />

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : byMonth.size === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No courses have a scheduled start date yet. Set a start/end date on a course to have it appear here.
          </CardContent>
        </Card>
      ) : (
        Array.from(byMonth.entries()).map(([month, courses]) => (
          <Card key={month}>
            <CardHeader>
              <CardTitle className="text-base">{month}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
                {courses.map((course) => (
                  <li key={course.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                    <div>
                      <p className="font-medium text-foreground">{course.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(course.startDate!).toLocaleDateString()}
                        {course.endDate ? ` – ${new Date(course.endDate).toLocaleDateString()}` : ""} ·{" "}
                        {course.institution?.name ?? "No institution set"}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {course.category.isMandatory ? <Badge variant="destructive">Mandatory</Badge> : null}
                      <Badge variant="outline">{DELIVERY_METHOD_LABELS[course.deliveryMethod]}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  )
}
