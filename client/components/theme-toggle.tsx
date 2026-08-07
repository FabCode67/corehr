"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"
import { useTheme } from "next-themes"

/**
 * Sun/Moon icon button for the header — the missing UI for dark-mode
 * support that already existed under the hood (components/theme-provider.tsx
 * has next-themes fully wired up, including a "d" keyboard shortcut) but
 * had no visible way to trigger it before this.
 *
 * The `mounted` check avoids a hydration mismatch: next-themes only knows
 * the real resolved theme (system preference / localStorage choice) once
 * it's running on the client — the server-rendered HTML can't know it — so
 * the icon renders invisibly-but-reserving-space until mounted rather than
 * guessing and having to flip after hydration.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isDark = mounted && resolvedTheme === "dark"

  return (
    <button
      type="button"
      onClick={() => setTheme(isDark ? "light" : "dark")}
      aria-label={mounted ? (isDark ? "Switch to light mode" : "Switch to dark mode") : "Toggle theme"}
      title="Toggle theme (or press D)"
      className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {mounted ? (
        isDark ? (
          <Sun className="size-5" />
        ) : (
          <Moon className="size-5" />
        )
      ) : (
        <Moon className="size-5 opacity-0" />
      )}
    </button>
  )
}
