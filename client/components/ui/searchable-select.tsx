"use client"

import { useMemo, useState } from "react"
import { Check, ChevronDown, Search, X } from "lucide-react"

import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

import { Popover, PopoverPortal, PopoverPositioner, PopoverTrigger } from "./popover"

export interface SearchableSelectOption {
  value: string
  label: string
  /** Extra text searched against and shown under the label (e.g. a
   *  department name under a position title) — optional. */
  description?: string
}

interface SearchableSelectProps {
  options: SearchableSelectOption[]
  /** Controlled value — pass together with `onValueChange`. */
  value?: string
  /** Uncontrolled starting value — for plain `<form method="get">`/Server
   *  Action forms that only need the value at submit time via `name`. */
  defaultValue?: string
  onValueChange?: (value: string) => void
  /** When set, a hidden `<input>` keeps this field submittable inside a
   *  plain HTML form exactly like a native `<select name=...>` would be —
   *  this is what makes it a drop-in replacement for `<Select>`. */
  name?: string
  placeholder?: string
  searchPlaceholder?: string
  emptyText?: string
  className?: string
  disabled?: boolean
  required?: boolean
  /** Show a "Clear selection" row when something is selected. Set to
   *  false for required fields where clearing back to empty isn't valid. */
  clearable?: boolean
}

/**
 * Searchable dropdown — a drop-in replacement for `<Select>` (components/ui/select.tsx)
 * for any list long enough that scrolling through plain `<option>`s is
 * painful (employees, positions, departments, branches, and similar
 * organization-structure pickers). Built on the existing Popover wrapper
 * (@base-ui/react) rather than base-ui's own Combobox/Autocomplete
 * primitives — those need more Root/Input/List/Item wiring to get right
 * without a browser to test against, and this app's Select already made
 * the same call to stick with something simpler and fully controllable.
 *
 * Supports both usage styles already in the codebase: controlled
 * (`value`/`onValueChange`, for client components) and uncontrolled
 * (`defaultValue`/`name`, for `<form method="get">` and Server Action
 * forms — a hidden input keeps the selected value in the form's data).
 */
export function SearchableSelect({
  options,
  value: controlledValue,
  defaultValue,
  onValueChange,
  name,
  placeholder = "Select…",
  searchPlaceholder = "Search…",
  emptyText = "No matches.",
  className,
  disabled,
  required,
  clearable = true,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [internalValue, setInternalValue] = useState(defaultValue ?? "")
  const value = controlledValue !== undefined ? controlledValue : internalValue

  const selected = options.find((option) => option.value === value)
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter(
      (option) => option.label.toLowerCase().includes(q) || option.description?.toLowerCase().includes(q)
    )
  }, [options, query])

  function select(next: string) {
    if (controlledValue === undefined) setInternalValue(next)
    onValueChange?.(next)
    setOpen(false)
    setQuery("")
  }

  return (
    <div className="relative">
      {name ? <input type="hidden" name={name} value={value} required={required} /> : null}
      <Popover
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) setQuery("")
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
          <span className={cn("truncate text-left", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
        </PopoverTrigger>
        <PopoverPortal>
          {/* Composed from the primitives directly (not the shared
           *  PopoverContent) so alignment can be overridden to "start" —
           *  a search dropdown reads better anchored to the trigger's left
           *  edge than the header-dropdown default of "end". */}
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
                    if (event.key === "Enter" && filtered.length > 0) {
                      event.preventDefault()
                      select(filtered[0].value)
                    }
                  }}
                  placeholder={searchPlaceholder}
                  className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
                />
                {query ? (
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
                {clearable && value ? (
                  <button
                    type="button"
                    onClick={() => select("")}
                    className="flex w-full items-center px-3 py-1.5 text-left text-sm text-muted-foreground hover:bg-muted"
                  >
                    Clear selection
                  </button>
                ) : null}
                {filtered.length === 0 ? (
                  <p className="px-3 py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
                ) : (
                  filtered.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => select(option.value)}
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
