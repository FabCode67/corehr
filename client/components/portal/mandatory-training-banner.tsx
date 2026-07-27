import Link from "next/link"
import { AlertTriangle } from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchMyOverdueMandatory, fetchTeamOverdueMandatory } from "@/lib/api/learning"

/**
 * Renders the spec's mandatory-training warning banners: a prominent
 * employee-facing banner for the acting employee's own overdue mandatory
 * courses (e.g. AML past its 12-month deadline), and — only if they have
 * direct reports with overdue mandatory training — a manager-facing "your
 * team" banner. Both are computed server-side from
 * LearningAnalyticsService.myOverdueMandatory/teamOverdueMandatory, so
 * nothing renders at all for someone with no overdue mandatory training and
 * no direct reports in that state (this component returns null rather than
 * an empty card in that case).
 */
export async function MandatoryTrainingBanner({
  actingEmployeeId,
  myLearningHref = "/staff/learning",
}: {
  actingEmployeeId: string
  myLearningHref?: string
}) {
  if (!actingEmployeeId) return null

  const [mineResult, teamResult] = await Promise.all([
    fetchMyOverdueMandatory(actingEmployeeId),
    fetchTeamOverdueMandatory(actingEmployeeId),
  ])

  const mine = mineResult.ok ? mineResult.data : []
  const team = teamResult.ok ? teamResult.data.filter((a) => a.employee.employeeNumber !== actingEmployeeId) : []

  if (mine.length === 0 && team.length === 0) return null

  return (
    <div className="flex flex-col gap-4">
      {mine.length > 0 ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="size-4" />
              You have {mine.length} overdue mandatory course{mine.length > 1 ? "s" : ""}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-sm">
              {mine.map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span className="text-foreground">{a.course.name}</span>
                  <span className="text-xs text-destructive">
                    Due {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "—"}
                  </span>
                </li>
              ))}
            </ul>
            <Link href={myLearningHref} className="mt-2 inline-block text-xs font-medium text-primary hover:underline">
              Go to My Learning →
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {team.length > 0 ? (
        <Card className="border-destructive/40 bg-destructive/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base text-destructive">
              <AlertTriangle className="size-4" />
              {team.length} team member{team.length > 1 ? "s" : ""} with overdue mandatory training
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-1.5 text-sm">
              {team.slice(0, 6).map((a) => (
                <li key={a.id} className="flex items-center justify-between">
                  <span className="text-foreground">
                    {a.employee.firstName} {a.employee.lastName} — {a.course.name}
                  </span>
                  <span className="text-xs text-destructive">
                    Due {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : "—"}
                  </span>
                </li>
              ))}
            </ul>
            {team.length > 6 ? (
              <p className="mt-2 text-xs text-muted-foreground">+{team.length - 6} more.</p>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
