"use client"

import { usePathname, useRouter } from "next/navigation"
import { useTransition } from "react"

import { SearchableSelect, type SearchableSelectOption } from "@/components/ui/searchable-select"

/** Searchable dropdown that applies immediately: writes its value to the page's query string. */
export function LiveFilterSelect({
  param,
  options,
  defaultValue = "",
  placeholder,
  searchPlaceholder,
  className,
}: {
  param: string
  options: SearchableSelectOption[]
  defaultValue?: string
  placeholder?: string
  searchPlaceholder?: string
  className?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [, startTransition] = useTransition()

  function change(value: string) {
    const params = new URLSearchParams(window.location.search)
    if (value) params.set(param, value)
    else params.delete(param)
    params.delete("page")
    const qs = params.toString()
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
  }

  return (
    <SearchableSelect
      options={options}
      name={param}
      defaultValue={defaultValue}
      onValueChange={change}
      placeholder={placeholder}
      searchPlaceholder={searchPlaceholder}
      className={className}
    />
  )
}
