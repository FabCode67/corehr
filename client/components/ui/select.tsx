import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"

/**
 * Plain native <select>, styled to match Input/Button. The project's
 * other primitives wrap @base-ui/react, which does have a Select
 * compound component — but it requires Root/Trigger/Positioner/Popup/Item
 * wiring that's hard to get right without a browser to test in. A native
 * select is fully accessible and functionally sufficient for the admin
 * forms it's used in (department/position/band pickers etc.); revisit
 * only if a form needs rich option content (icons, descriptions) that a
 * native <option> can't render.
 */
function Select({ className, children, ...props }: React.ComponentProps<"select">) {
  return (
    <div className="relative">
      <select
        data-slot="select"
        className={cn(
          "flex h-9 w-full appearance-none rounded-lg border border-input bg-transparent px-3 py-1 pr-8 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 dark:bg-input/20",
          className
        )}
        {...props}
      >
        {children}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 right-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  )
}

export { Select }
