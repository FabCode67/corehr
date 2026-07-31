"use client"

import { useEffect, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { addInstitutionManually, searchInstitutionsAction } from "@/lib/api/professional-profile-actions"
import type { AcademicInstitution } from "@/lib/api/professional-profile"

/**
 * The Education form's institution field — searchable dropdown against
 * AcademicInstitution ("Search institution by name" / "by country" / "by
 * location"), plus the "Not Found? Add Institution Manually" fallback.
 * Renders hidden `institutionId`/`institutionName`/`country` inputs so the
 * enclosing <form>'s normal FormData submit picks up whichever path was
 * used, no extra plumbing needed in the parent.
 */
export function InstitutionPicker({ actingEmployeeId }: { actingEmployeeId: string }) {
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<AcademicInstitution[]>([])
  const [selected, setSelected] = useState<AcademicInstitution | null>(null)
  const [showManual, setShowManual] = useState(false)
  const [manualName, setManualName] = useState("")
  const [manualCountry, setManualCountry] = useState("")
  const [manualCity, setManualCity] = useState("")
  const [manualWebsite, setManualWebsite] = useState("")
  const [manualPending, setManualPending] = useState(false)
  const [manualError, setManualError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (selected || !query || query.trim().length < 2) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      const matches = await searchInstitutionsAction(query)
      setResults(matches)
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, selected])

  async function handleAddManually() {
    if (!manualName.trim()) {
      setManualError("Institution name is required.")
      return
    }
    setManualPending(true)
    setManualError(null)
    try {
      const created = await addInstitutionManually(actingEmployeeId, manualName, manualCountry || undefined, manualCity || undefined, manualWebsite || undefined)
      setSelected(created)
      setShowManual(false)
    } catch {
      setManualError("Failed to add this institution. Please try again.")
    } finally {
      setManualPending(false)
    }
  }

  if (selected) {
    return (
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-muted-foreground">Institution</Label>
        <input type="hidden" name="institutionId" value={selected.id} />
        <input type="hidden" name="country" value={selected.country ?? ""} />
        <div className="flex items-center justify-between rounded-md border border-border px-3 py-2 text-sm">
          <span>
            {selected.name}
            {selected.country ? <span className="text-muted-foreground"> · {selected.country}</span> : null}
            {selected.verificationStatus === "PENDING_REVIEW" ? (
              <Badge variant="outline" className="ml-2">
                Pending HR review
              </Badge>
            ) : null}
          </span>
          <button
            type="button"
            className="text-xs font-medium text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSelected(null)
              setQuery("")
            }}
          >
            Change
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="institution-search" className="text-xs text-muted-foreground">
        Institution
      </Label>
      <input type="hidden" name="institutionName" value="" />
      <Input
        id="institution-search"
        placeholder="Search by name, country, or city…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      {results.length > 0 ? (
        <ul className="rounded-md border border-border text-sm">
          {results.map((institution) => (
            <li key={institution.id}>
              <button
                type="button"
                className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted"
                onClick={() => {
                  setSelected(institution)
                  setResults([])
                }}
              >
                <span>{institution.name}</span>
                <span className="text-xs text-muted-foreground">{institution.country ?? ""}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {!showManual ? (
        <button
          type="button"
          className="self-start text-xs font-medium text-primary hover:underline"
          onClick={() => {
            setShowManual(true)
            setManualName(query)
          }}
        >
          Not Found? Add Institution Manually
        </button>
      ) : (
        <div className="mt-1 flex flex-col gap-2 rounded-md border border-dashed border-border p-3">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Input placeholder="Institution name" value={manualName} onChange={(e) => setManualName(e.target.value)} />
            <Input placeholder="Country" value={manualCountry} onChange={(e) => setManualCountry(e.target.value)} />
            <Input placeholder="City" value={manualCity} onChange={(e) => setManualCity(e.target.value)} />
            <Input placeholder="Website (optional)" value={manualWebsite} onChange={(e) => setManualWebsite(e.target.value)} />
          </div>
          {manualError ? <p className="text-xs text-destructive">{manualError}</p> : null}
          <div className="flex gap-2">
            <Button type="button" size="sm" disabled={manualPending} onClick={handleAddManually}>
              {manualPending ? "Adding…" : "Use this institution"}
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setShowManual(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">This will be stored and reviewed by HR before it appears for other employees.</p>
        </div>
      )}
    </div>
  )
}
