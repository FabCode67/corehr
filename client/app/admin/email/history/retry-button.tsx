"use client"

import { useTransition } from "react"

import { Button } from "@/components/ui/button"
import { retryEmail } from "@/lib/api/email-actions"

export function RetryButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await retryEmail(id)
        })
      }
    >
      {pending ? "Retrying…" : "Retry"}
    </Button>
  )
}
