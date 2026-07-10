import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchFunctions } from "@/lib/api/departments"

import { createDepartment } from "../actions"
import { DepartmentForm } from "../department-form"

export default async function NewDepartmentPage() {
  const result = await fetchFunctions()

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link
          href="/admin/departments"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to departments
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">New department</h1>
      </div>

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <DepartmentForm
              functions={result.data}
              action={createDepartment}
              submitLabel="Create department"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
