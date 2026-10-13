import type { Metadata } from "next"
import { notFound } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShareJobPanel } from "@/components/share-job-panel"
import { fetchPublicJob } from "@/lib/api/public-jobs"
import { getPublicBaseUrl } from "@/lib/public-url"

import { ApplyForm } from "./apply-form"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const result = await fetchPublicJob(slug)
  if (!result.ok) return { title: "Job not found" }
  const job = result.data
  const description = (job.summary ?? job.description).slice(0, 200)
  return {
    title: `${job.postingTitle} · NCBA Rwanda`,
    description,
    openGraph: { title: job.postingTitle, description, type: "website" },
    twitter: { card: "summary", title: job.postingTitle, description },
  }
}

function Lines({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm text-foreground">
      {text.split("\n").filter((l) => l.trim()).map((line, i) => (
        <p key={i}>{line}</p>
      ))}
    </div>
  )
}

export default async function PublicJobPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const result = await fetchPublicJob(slug)
  if (!result.ok) notFound()
  const job = result.data
  const url = `${await getPublicBaseUrl()}/jobs/${job.shareSlug}`

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-semibold text-foreground">{job.postingTitle}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {job.branch.name} · {job.employmentType.replaceAll("_", " ")} · apply by {new Date(job.closingDate).toLocaleDateString()}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">About the role</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Lines text={job.description} />
          <div>
            <h3 className="mb-1 text-sm font-semibold">Responsibilities</h3>
            <Lines text={job.responsibilities} />
          </div>
          <div>
            <h3 className="mb-1 text-sm font-semibold">Qualifications</h3>
            <Lines text={job.qualifications} />
          </div>
          {job.requiredExperience ? (
            <div>
              <h3 className="mb-1 text-sm font-semibold">Experience</h3>
              <Lines text={job.requiredExperience} />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Share this job</CardTitle>
        </CardHeader>
        <CardContent>
          <ShareJobPanel url={url} title={job.postingTitle} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Apply</CardTitle>
          <CardDescription>No account needed. Fill in your details and upload your documents (PDF, Word, JPG or PNG, up to 5 MB each).</CardDescription>
        </CardHeader>
        <CardContent>
          {job.open ? (
            <ApplyForm slug={job.shareSlug} requiredDocuments={job.requiredDocuments} />
          ) : (
            <p className="text-sm text-muted-foreground">This position is no longer accepting applications.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
