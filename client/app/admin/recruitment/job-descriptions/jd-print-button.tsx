"use client"

import { Button } from "@/components/ui/button"

/** Browser print dialog → "Save as PDF". Only the JD (#jd-print) is printed. */
export function JdPrintButton() {
  return (
    <>
      <style>{`@media print { body * { visibility: hidden } #jd-print, #jd-print * { visibility: visible } #jd-print { position: absolute; left: 0; top: 0; width: 100%; box-shadow: none } }`}</style>
      <Button type="button" size="sm" variant="outline" onClick={() => window.print()}>
        Print / Save as PDF
      </Button>
    </>
  )
}
