import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { ASSIGNMENT_STATUS_LABELS, PRIORITY_LABELS, type CourseAssignment } from "@/lib/api/learning"

const STATUS_VARIANT: Record<string, "outline" | "secondary" | "success" | "destructive"> = {
  ASSIGNED: "outline",
  ACCEPTED: "secondary",
  IN_PROGRESS: "secondary",
  COMPLETED_BY_EMPLOYEE: "secondary",
  PENDING_VERIFICATION: "secondary",
  VERIFIED: "success",
  REJECTED: "destructive",
  CLOSED: "success",
}

export function AssignmentList({ assignments }: { assignments: CourseAssignment[] }) {
  if (assignments.length === 0) {
    return <p className="py-2 text-sm text-muted-foreground">None.</p>
  }

  return (
    <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
      {assignments.map((assignment) => (
        <li key={assignment.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
          <div>
            <Link href={`/staff/learning/${assignment.id}`} className="font-medium text-foreground hover:underline">
              {assignment.course.name}
            </Link>
            <p className="text-xs text-muted-foreground">
              {assignment.dueDate ? `Due ${new Date(assignment.dueDate).toLocaleDateString()}` : "No due date"} ·{" "}
              {PRIORITY_LABELS[assignment.priority]} priority
              {assignment.recommendationComment ? ` · "${assignment.recommendationComment}"` : ""}
            </p>
          </div>
          <Badge variant={STATUS_VARIANT[assignment.status]}>{ASSIGNMENT_STATUS_LABELS[assignment.status]}</Badge>
        </li>
      ))}
    </ul>
  )
}
