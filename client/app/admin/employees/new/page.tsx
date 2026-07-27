import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchBranches } from "@/lib/api/branches"

import { createEmployee } from "../actions"
import { BasicInfoForm } from "../employee-form"

export default async function NewEmployeePage() {
  const branchesResult = await fetchBranches()
  const branches = branchesResult.ok ? branchesResult.data : []

  return (
    <div className="flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/admin/employees"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to employees
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New employee</h1>
        <p className="text-sm text-muted-foreground">
          Basic Information is the only required step — employment details, position
          assignment, family, and education can all be filled in later.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Step 1 of 5 · Basic Information</CardTitle>
          <CardDescription>
            Once this is saved, you can continue through the rest of the registration wizard
            on the employee's page — or leave and come back to it anytime.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BasicInfoForm
            branches={branches}
            action={createEmployee}
            submitLabel="Create employee & continue"
          />
        </CardContent>
      </Card>
    </div>
  )
}
