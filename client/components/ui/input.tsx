import { Input as InputPrimitive } from "@base-ui/react/input"

import { cn } from "@/lib/utils"

function Input({ className, ...props }: InputPrimitive.Props) {
  return (
    <InputPrimitive
      data-slot="input"
      className={cn(
        // [color-scheme:light]/dark:[color-scheme:dark] — same fix as
        // components/ui/select.tsx, needed here too since type="date"/
        // type="time" inputs render a native popup picker that otherwise
        // stays light regardless of the app's dark theme. See that file's
        // comment for the full explanation.
        "flex h-9 w-full min-w-0 rounded-lg border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none transition-colors selection:bg-primary selection:text-primary-foreground placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 [color-scheme:light] dark:bg-input/20 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 dark:[color-scheme:dark]",
        className
      )}
      {...props}
    />
  )
}

export { Input }
