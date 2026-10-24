"use client"

import { usePathname, useRouter } from "next/navigation"
import { useEffect, useRef, useState, useTransition } from "react"

import { Input } from "@/components/ui/input"

/**
 * Search box that filters as you type: after a short pause it writes the text to
 * the page's `?search=` (or `param`) query string and the server page re-renders.
 * Other query parameters are kept; paging is reset. Safe inside a GET form too.
 */
export function LiveSearchInput({
  param = "search",
  defaultValue = "",
  placeholder,
  className,
  delay = 300,
}: {
  param?: string
  defaultValue?: string
  placeholder?: string
  className?: string
  delay?: number
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [value, setValue] = useState(defaultValue)
  const [pending, startTransition] = useTransition()
  const first = useRef(true)

  useEffect(() => {
    if (first.current) {
      first.current = false
      return
    }
    const timer = setTimeout(() => {
      const params = new URLSearchParams(window.location.search)
      const trimmed = value.trim()
      if (trimmed) params.set(param, trimmed)
      else params.delete(param)
      params.delete("page")
      const qs = params.toString()
      startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }))
    }, delay)
    return () => clearTimeout(timer)
  }, [value, param, delay, pathname, router])

  return (
    <Input
      type="search"
      name={param}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      placeholder={placeholder}
      className={className}
      autoComplete="off"
      aria-busy={pending}
    />
  )
}
