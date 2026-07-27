import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"

import { createBranch } from "../actions"
import { BranchForm } from "../branch-form"

export default function NewBranchPage() {
  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link
          href="/admin/branches"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to branches
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New branch</h1>
      </div>

      <Card>
        <CardContent>
          <BranchForm action={createBranch} submitLabel="Create branch" />
        </CardContent>
      </Card>
    </div>
  )
}
