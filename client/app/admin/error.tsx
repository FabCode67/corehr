"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

/** Admin-portal error boundary: keeps the sidebar/layout and shows the error
 *  digest, which can be searched in the Vercel function logs to find the cause. */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <Card className="max-w-xl border-dashed border-destructive/40">
      <CardHeader>
        <CardTitle className="text-base">This page couldn&apos;t load</CardTitle>
        <CardDescription>
          Something went wrong while rendering it. If it keeps happening, send the reference below to support.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {error.digest ? <p className="font-mono text-xs text-muted-foreground">Reference: {error.digest}</p> : null}
        {process.env.NODE_ENV !== "production" && error.message ? <p className="text-xs text-destructive">{error.message}</p> : null}
        <div>
          <Button type="button" size="sm" onClick={reset}>
            Try again
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
