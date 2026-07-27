import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { createCandidate } from "@/lib/api/recruitment-actions"

import { CandidateForm } from "./candidate-form"

export default function NewCandidatePage() {
  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/admin/recruitment/candidates"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to candidates
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New candidate</h1>
      </div>

      <Card>
        <CardContent>
          <CandidateForm action={createCandidate} />
        </CardContent>
      </Card>
    </div>
  )
}
