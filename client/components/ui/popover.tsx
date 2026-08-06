import type * as React from "react"

import { Popover as PopoverPrimitive } from "@base-ui/react/popover"

import { cn } from "@/lib/utils"

/**
 * Thin wrapper around @base-ui/react's Popover, styled to match the rest of
 * the design system — same wrap-and-style approach as dialog.tsx. Unlike
 * Dialog this is non-modal by default (no backdrop, background stays
 * interactive, closes on outside click/Escape automatically via Base UI),
 * which is what a header dropdown (e.g. the notification bell) wants.
 */

function Popover(props: PopoverPrimitive.Root.Props) {
  return <PopoverPrimitive.Root data-slot="popover" {...props} />
}

function PopoverTrigger(props: PopoverPrimitive.Trigger.Props) {
  return <PopoverPrimitive.Trigger data-slot="popover-trigger" {...props} />
}

function PopoverPortal(props: PopoverPrimitive.Portal.Props) {
  return <PopoverPrimitive.Portal data-slot="popover-portal" {...props} />
}

function PopoverPositioner({
  sideOffset = 8,
  align = "end",
  ...props
}: PopoverPrimitive.Positioner.Props) {
  return (
    <PopoverPrimitive.Positioner
      data-slot="popover-positioner"
      sideOffset={sideOffset}
      align={align}
      className="z-50"
      {...props}
    />
  )
}

function PopoverContent({ className, children, ...props }: PopoverPrimitive.Popup.Props) {
  return (
    <PopoverPortal>
      <PopoverPositioner>
        <PopoverPrimitive.Popup
          data-slot="popover-content"
          className={cn(
            "w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl border border-border bg-card shadow-2xl outline-none transition-all duration-150 data-[ending-style]:scale-95 data-[ending-style]:opacity-0 data-[starting-style]:scale-95 data-[starting-style]:opacity-0",
            className
          )}
          {...props}
        >
          {children}
        </PopoverPrimitive.Popup>
      </PopoverPositioner>
    </PopoverPortal>
  )
}

export { Popover, PopoverTrigger, PopoverPortal, PopoverPositioner, PopoverContent }
