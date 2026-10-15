import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { fetchJobDescriptionStructured } from "@/lib/api/recruitment"
import { saveJobDescriptionStructured } from "@/lib/api/recruitment-actions"

import { JdEditor } from "../../jd-editor"
import { fetchJdLookups } from "../../jd-lookups"

export default async function EditJobDescriptionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await fetchJobDescriptionStructured(id)
  if (!result.ok) {
    if (result.status === 404) notFound()
    return <p className="text-sm text-destructive">{result.error}</p>
  }

  const lookups = await fetchJdLookups()

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href={`/admin/recruitment/job-descriptions/${id}`} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to job description
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Edit job description</h1>
      </div>
      <JdEditor lookups={lookups} initial={result.data.content} submitLabel="Save changes" action={saveJobDescriptionStructured.bind(null, id, {})} />
    </div>
  )
}
