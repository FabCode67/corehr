import Link from "next/link"

import { Card, CardContent } from "@/components/ui/card"
import { fetchPublicJobs } from "@/lib/api/public-jobs"

export const metadata = { title: "Careers · NCBA Rwanda" }

export default async function PublicJobsPage() {
  const result = await fetchPublicJobs()
  const jobs = result.ok ? result.data : []
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold text-foreground">Open positions</h1>
      {jobs.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">No open positions right now. Please check back soon.</CardContent>
        </Card>
      ) : (
        jobs.map((job) => (
          <Link key={job.shareSlug} href={`/jobs/${job.shareSlug}`}>
            <Card className="transition-colors hover:bg-muted/40">
              <CardContent className="flex items-center justify-between py-4">
                <div>
                  <p className="font-medium text-foreground">{job.postingTitle}</p>
                  <p className="text-xs text-muted-foreground">
                    {job.branch.name} · {job.employmentType.replaceAll("_", " ")} · closes {new Date(job.closingDate).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-sm text-primary">View →</span>
              </CardContent>
            </Card>
          </Link>
        ))
      )}
    </div>
  )
}
