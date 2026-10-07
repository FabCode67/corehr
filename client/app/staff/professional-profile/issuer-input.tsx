"use client"

import { useEffect, useRef, useState } from "react"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { searchIssuersAction } from "@/lib/api/professional-profile-actions"

/**
 * "Issuing Organization" field with search suggestions (well-known
 * certification bodies, issuers already used in the system, and
 * universities/colleges). It's still a plain text input named `issuer`, so
 * anything typed that isn't suggested is simply used as-is ("Other") — no
 * separate manual-entry step needed.
 */
export function IssuerInput({ id = "cert-issuer", required = true }: { id?: string; required?: boolean }) {
  const [value, setValue] = useState("")
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!open || value.trim().length < 2) {
      setSuggestions([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setSuggestions(await searchIssuersAction(value))
    }, 250)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [value, open])

  return (
    <div className="relative flex flex-col gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        Issuing Organization
      </Label>
      <Input
        id={id}
        name="issuer"
        autoComplete="off"
        placeholder="Search, or type the organization's name…"
        value={value}
        required={required}
        maxLength={160}
        onChange={(e) => {
          setValue(e.target.value)
          setOpen(true)
        }}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
      />
      {open && suggestions.length > 0 ? (
        <ul className="absolute left-0 right-0 top-full z-20 mt-1 max-h-56 overflow-auto rounded-md border border-border bg-popover text-sm shadow-md">
          {suggestions.map((name) => (
            <li key={name}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left hover:bg-muted"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  setValue(name)
                  setSuggestions([])
                  setOpen(false)
                }}
              >
                {name}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      <p className="text-xs text-muted-foreground">Not listed? Just type the organization&apos;s name.</p>
    </div>
  )
}
