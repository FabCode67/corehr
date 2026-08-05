import { redirect } from "next/navigation"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FamilyTree } from "@/components/family-tree/family-tree"
import { fetchEmployeeFamilyTree } from "@/lib/api/employees"
import { getSession } from "@/lib/get-session"

export default async function StaffFamilyPage() {
  const session = await getSession()
  if (!session) redirect("/login")

  const result = await fetchEmployeeFamilyTree(session.employeeId)

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Family &amp; Dependents</h1>
        <p className="text-sm text-muted-foreground">
          Spouse, children, parents, siblings, and other dependent information HR has on file for you. Contact HR to
          add or correct anything here.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Family Tree</CardTitle>
          <CardDescription>A diagram of your family/dependent records — not editable here.</CardDescription>
        </CardHeader>
        <CardContent>
          {!result.ok ? <p className="text-sm text-destructive">{result.error}</p> : <FamilyTree tree={result.data} />}
        </CardContent>
      </Card>
    </div>
  )
}
