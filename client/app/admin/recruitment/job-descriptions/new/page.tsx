import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { fetchBands } from "@/lib/api/bands"
import { fetchPositionLevels, fetchPositions } from "@/lib/api/positions"
import { createJobDescription } from "@/lib/api/recruitment-actions"

import { JobDescriptionForm } from "./job-description-form"

export default async function NewJobDescriptionPage() {
  const [levelsResult, bandsResult, positionsResult] = await Promise.all([fetchPositionLevels(), fetchBands(), fetchPositions()])

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin/recruitment/job-descriptions"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to job descriptions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New job description</h1>
      </div>

      <Card>
        <CardContent>
          <JobDescriptionForm
            levels={levelsResult.ok ? levelsResult.data : []}
            bands={bandsResult.ok ? bandsResult.data : []}
            positions={positionsResult.ok ? positionsResult.data : []}
            action={createJobDescription}
            submitLabel="Create job description"
          />
        </CardContent>
      </Card>
    </div>
  )
}
