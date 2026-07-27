import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchRatingScale } from "@/lib/api/performance"

import { PerformanceTabs } from "../performance-tabs"
import { RatingScaleForm } from "./rating-scale-form"

export default async function RatingScalePage() {
  const result = await fetchRatingScale(true)
  const scale = result.ok ? [...result.data].sort((a, b) => b.rank - a.rank) : []

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Performance Management</h1>
        <p className="text-sm text-muted-foreground">
          Configure the 1–5 performance rating scale labels and descriptions.
        </p>
      </div>

      <PerformanceTabs />

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : (
        <div className="flex flex-col gap-4">
          {scale.map((entry) => (
            <Card key={entry.id}>
              <CardHeader>
                <CardTitle className="text-base">
                  {entry.rank} — {entry.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <RatingScaleForm entry={entry} />
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
