"use client"

import { useEffect, useRef, useState } from "react"
import { Check, ChevronDown, Loader2, Search, X } from "lucide-react"

import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

import { Popover, PopoverPortal, PopoverPositioner, PopoverTrigger } from "./popover"
import type { SearchableSelectOption } from "./searchable-select"

interface SearchableSelectAsyncProps {
  /** Server Action (or any async function) that resolves a query string to
   *  a small page of matches — e.g. searchEmployeesAction. Called debounced
   *  as the user types, never with the full underlying record set. */
  loadOptions: (query: string) => Promise<SearchableSelectOption[]>
  /** The already-selected option's {value,label} — needed up front on edit
   *  forms so the trigger can show a name immediately without a search
   *  round-trip just to resolve one label. Omit for a fresh/empty picker. */
  initialOption?: SearchableSelectOption | null
  value?: string
  defaultValue?: string
  onValueChange?: (value: string, option?: SearchableSelectOption) => void
  name?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  minQueryLength?: number
  debounceMs?: number
  className?: string
  disabled?: boolean
  required?: boolean
  clearable?: boolean
}

/**
 * Server-search variant of SearchableSelect — for pickers backed by a large,
 * fast-growing record set (employees, chiefly) where loading every option
 * into the browser up front doesn't scale. Same Popover-based UI and the
 * same controlled (`value`/`onValueChange`)/uncontrolled (`name`/
 * `defaultValue`) usage split, but options are fetched a page at a time via
 * `loadOptions` as the user types, debounced, instead of being filtered
 * client-side out of a prop already sitting in memory.
 */
export function SearchableSelectAsync({
  loadOptions,
  initialOption = null,
  value: controlledValue,
  defaultValue,
  onValueChange,
  name,
  placeholder = "Search…",
  searchPlaceholder = "Type to search…",
  emptyText = "No matches.",
  minQueryLength = 1,
  debounceMs = 250,
  className,
  disabled,
  required,
  clearable = true,
}: SearchableSelectAsyncProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchableSelectOption[]>([])
  const [loading, setLoading] = useState(false)
  const [internalValue, setInternalValue] = useState(defaultValue ?? "")
  const [selectedOption, setSelectedOption] = useState<SearchableSelectOption | null>(initialOption)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const value = controlledValue !== undefined ? controlledValue : internalValue

  useEffect(() => {
    if (!open || query.trim().length < minQueryLength) {
      setResults([])
      return
    }
    setLoading(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      try {
        const matches = await loadOptions(query.trim())
        setResults(matches)
      } finally {
        setLoading(false)
      }
    }, debounceMs)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, open, minQueryLength, debounceMs])

  function select(option: SearchableSelectOption | null) {
    const next = option?.value ?? ""
    if (controlledValue === undefined) setInternalValue(next)
    setSelectedOption(option)
    onValueChange?.(next, option ?? undefined)
    setOpen(false)
    setQuery("")
    setResults([])
  }

  return (
    <div className="relative">
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) {
            setQuery("")
            setResults([])
          }
        }}
      >
        <PopoverTrigger
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/20",
            className
          )}
        >
          <span className={cn("truncate text-left", !selectedOption && "text-muted-foreground")}>
            {selectedOption ? selectedOption.label : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverPortal>
          <PopoverPositioner align="start" sideOffset={4} className="z-50">
            <PopoverPrimitive.Popup
              className={cn(
                "w-72 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl outline-none transition-all duration-150",
                "data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0"
              )}
            >
              <div className="flex items-center gap-2 border-b border-border px-3 py-2">
                <Search className="size-3.5 shrink-0 text-muted-foreground" />
                <input
                  autoFocus
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && results.length > 0) {
                      event.preventDefault()
                      select(results[0])
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {loading ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin text-muted-foreground" />
                ) : query ? (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label="Clear search"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>
              <div className="max-h-64 overflow-y-auto py-1">
                {clearable && selectedOption ? (
                  <button
                    type="button"
                    onClick={() => select(null)}
                    className="flex w-full items-center px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
                  >
                    Clear selection
                  </button>
                ) : null}
                {query.trim().length < minQueryLength ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">{searchPlaceholder}</p>
                ) : !loading && results.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
                ) : (
                  results.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => select(option)}
                      className={cn(
                        "flex w-full items-center justify-between gap-2 px-3 py-1.5 text-left text-sm hover:bg-muted",
                        option.value === value && "bg-muted/60 font-medium text-foreground"
                      )}
                    >
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate">{option.label}</span>
                        {option.description ? (
                          <span className="truncate text-xs text-muted-foreground">{option.description}</span>
                        ) : null}
                      </span>
                      {option.value === value ? <Check className="size-3.5 shrink-0 text-primary" /> : null}
                    </button>
                  ))
                )}
              </div>
            </PopoverPrimitive.Popup>
          </PopoverPositioner>
        </PopoverPortal>
      </Popover>
    </div>
  )
}
