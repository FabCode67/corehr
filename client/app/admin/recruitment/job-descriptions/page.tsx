import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchJobDescriptions } from "@/lib/api/recruitment"

import { RecruitmentTabs } from "../recruitment-tabs"

export default async function JobDescriptionsPage() {
  const result = await fetchJobDescriptions(true)
  const jobDescriptions = result.ok ? result.data : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Recruitment Management</h1>
          <p className="text-sm text-muted-foreground">Reusable job description templates, linked to requisitions.</p>
        </div>
        <Link href="/admin/recruitment/job-descriptions/new" className={buttonVariants({ size: "sm" })}>
          New job description
        </Link>
      </div>

      <RecruitmentTabs />

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : jobDescriptions.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            No job descriptions yet.{" "}
            <Link href="/admin/recruitment/job-descriptions/new" className="text-primary underline">
              Create the first one
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {jobDescriptions.map((jobDescription) => (
            <Card key={jobDescription.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{jobDescription.jobTitle}</CardTitle>
                  <Badge variant={jobDescription.isActive ? "success" : "outline"}>{jobDescription.isActive ? "Active" : "Inactive"}</Badge>
                </div>
                <CardDescription>{jobDescription.workLocation ?? "Location not set"}</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="line-clamp-3 text-sm text-muted-foreground">{jobDescription.jobSummary}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
