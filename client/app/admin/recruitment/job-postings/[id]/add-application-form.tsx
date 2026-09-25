"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { createApplication } from "@/lib/api/recruitment-actions"
import type { Candidate } from "@/lib/api/recruitment"

export function AddApplicationForm({ postingId, actingEmployeeId, candidates }: { postingId: string; actingEmployeeId: string; candidates: Candidate[] }) {
  const router = useRouter()
  const [candidateId, setCandidateId] = useState("")
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function submit() {
    if (!candidateId) return
    setError(null)
    startTransition(async () => {
      const result = await createApplication(candidateId, postingId, actingEmployeeId)
      if (result?.error) {
        setError(result.error)
        return
      }
      setCandidateId("")
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Record an application for an existing candidate</p>
      <div className="flex flex-wrap items-center gap-2">
        <SearchableSelect
          options={candidates.map((candidate) => ({
            value: candidate.id,
            label: `${candidate.firstName} ${candidate.lastName} (${candidate.email})`,
          }))}
          value={candidateId}
          onValueChange={setCandidateId}
          className="w-64"
          placeholder="Select a candidate…"
          searchPlaceholder="Search candidates…"
        />
        <Button type="button" size="sm" disabled={pending || !candidateId} onClick={submit}>
          {pending ? "Recording…" : "Record application"}
        </Button>
        <Link href="/admin/recruitment/candidates/new" className="text-xs text-primary hover:underline">
          New candidate
        </Link>
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
