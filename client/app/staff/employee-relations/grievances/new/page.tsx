import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { getSession } from "@/lib/get-session"

import { GrievanceForm } from "../grievance-form"

export default async function NewGrievancePage() {
  const session = await getSession()

  return (
    <div className="flex max-w-xl flex-col gap-6">
      <div>
        <Link href="/staff/employee-relations" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          Back to Employee Relations
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">Submit a grievance</h1>
      </div>

      <Card>
        <CardContent>
          <GrievanceForm employeeId={session?.employeeId ?? ""} />
        </CardContent>
      </Card>
    </div>
  )
}
