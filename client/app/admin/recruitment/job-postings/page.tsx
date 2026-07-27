import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchJobPostings, type JobPostingStatus } from "@/lib/api/recruitment"
import { getSession } from "@/lib/get-session"

import { RecruitmentTabs } from "../recruitment-tabs"

const STATUS_VARIANT: Record<JobPostingStatus, "outline" | "success"> = {
  DRAFT: "outline",
  PUBLISHED: "success",
  CLOSED: "outline",
}

export default async function JobPostingsPage() {
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const result = await fetchJobPostings({}, actingEmployeeId)
  const postings = result.ok ? result.data : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Recruitment Management</h1>
        <p className="text-sm text-muted-foreground">
          Job postings — created from an approved requisition. See a requisition&apos;s page to post a new vacancy.
        </p>
      </div>

      <RecruitmentTabs />

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : postings.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">No job postings yet.</CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Title</th>
                  <th className="px-4 py-3 font-medium">Position</th>
                  <th className="px-4 py-3 font-medium">Closing date</th>
                  <th className="px-4 py-3 font-medium">Applications</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {postings.map((posting) => (
                  <tr key={posting.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">{posting.postingTitle}</td>
                    <td className="px-4 py-3 text-muted-foreground">{posting.requisition.position.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(posting.closingDate).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{posting._count.applications}</td>
                    <td className="px-4 py-3">
                      <Badge variant={STATUS_VARIANT[posting.status]}>{posting.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/recruitment/job-postings/${posting.id}`} className="text-xs font-medium text-primary hover:underline">
                        Manage
                      </Link>
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
