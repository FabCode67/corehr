import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { fetchJobDescriptionStructured } from "@/lib/api/recruitment"

import { JdDocument } from "../jd-document"
import { JdPrintButton } from "../jd-print-button"

export default async function JobDescriptionViewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const result = await fetchJobDescriptionStructured(id)
  if (!result.ok) {
    if (result.status === 404) notFound()
    return <p className="text-sm text-destructive">{result.error}</p>
  }
  const jd = result.data

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2 print:hidden">
        <Link href="/admin/recruitment/job-descriptions" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to job descriptions
        </Link>
        <div className="flex flex-wrap gap-2">
          <Link href={`/admin/recruitment/job-descriptions/${id}/edit`} className={buttonVariants({ size: "sm", variant: "outline" })}>
            Edit
          </Link>
          <Link href={`/admin/recruitment/job-descriptions/new?from=${id}`} className={buttonVariants({ size: "sm", variant: "outline" })}>
            Reuse as new
          </Link>
          <a href={`/api/recruitment/job-descriptions/${id}/docx`} className={buttonVariants({ size: "sm" })}>
            <Download className="mr-1.5 size-4" />
            Download Word
          </a>
          <JdPrintButton />
        </div>
      </div>
      <JdDocument content={jd.content} />
    </div>
  )
}
