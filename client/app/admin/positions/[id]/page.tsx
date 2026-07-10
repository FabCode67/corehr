import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchDepartments } from "@/lib/api/departments"
import { fetchPosition, fetchPositionLevels, fetchPositions } from "@/lib/api/positions"

import { updatePosition } from "../actions"
import { PositionForm } from "../position-form"

export default async function EditPositionPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const [positionResult, departmentsResult, levelsResult, positionsResult] = await Promise.all([
    fetchPosition(id),
    fetchDepartments(),
    fetchPositionLevels(),
    fetchPositions(),
  ])

  if (!positionResult.ok) {
    if (positionResult.status === 404) {
      notFound()
    }

    return (
      <Card className="max-w-2xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{positionResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const position = positionResult.data

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <div>
        <Link
          href="/admin/positions"
          className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" />
          Back to positions
        </Link>
        <h1 className="mt-2 text-2xl font-semibold text-foreground">{position.title}</h1>
      </div>

      {!departmentsResult.ok || !levelsResult.ok || !positionsResult.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>
              {!departmentsResult.ok
                ? departmentsResult.error
                : !levelsResult.ok
                  ? levelsResult.error
                  : !positionsResult.ok
                    ? positionsResult.error
                    : null}
            </CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <Card>
          <CardContent>
            <PositionForm
              departments={departmentsResult.data}
              levels={levelsResult.data}
              positions={positionsResult.data}
              position={position}
              action={updatePosition.bind(null, position.id)}
              submitLabel="Save changes"
            />
          </CardContent>
        </Card>
      )}
    </div>
  )
}
