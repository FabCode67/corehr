"use client"

import { useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { runCarryForward } from "@/lib/api/leave-actions"

export function CarryForwardButton({ fromYear, toYear }: { fromYear: number; toYear: number }) {
  const [pending, startTransition] = useTransition()
  const [message, setMessage] = useState<string | null>(null)

  function handleRun() {
    if (!window.confirm(`Carry forward unused ${fromYear} balances into ${toYear}?`)) return
    setMessage(null)
    startTransition(async () => {
      const result = await runCarryForward(fromYear, toYear)
      setMessage(result?.error ?? "Carry-forward run complete.")
    })
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <Button type="button" size="sm" variant="outline" onClick={handleRun} disabled={pending}>
        {pending ? "Running…" : `Run carry-forward (${fromYear} → ${toYear})`}
      </Button>
      {message ? <p className="text-xs text-muted-foreground">{message}</p> : null}
    </div>
  )
}
