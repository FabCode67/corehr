import { cn } from "@/lib/utils"

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return ""
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

/** Turns a raw id (uuid, etc.) into a DocuSign-style reference string, e.g.
 *  "DFD21DC67BF1455…" — uppercased, dashes stripped, truncated. */
export function signatureReference(id: string): string {
  const stripped = id.replaceAll("-", "").toUpperCase()
  return `${stripped.slice(0, 14)}…`
}

/**
 * A DocuSign-style signature stamp: "DocuSigned by:" label, the signer's
 * name in a cursive script, an initials box, and a reference id underneath.
 * Purely decorative — the record of who signed and when still comes from
 * FormSignature.signerId/signedAt; this just renders it the way the
 * business is used to seeing signatures look, on screen and in the PDF.
 */
export function SignatureStamp({
  name,
  referenceId,
  className,
}: {
  name: string
  referenceId: string
  className?: string
}) {
  const initials = initialsOf(name)

  return (
    <div
      data-slot="signature-stamp"
      className={cn("inline-flex items-start gap-3 rounded-md border border-primary/25 bg-primary/[0.04] px-3 py-2", className)}
    >
      <div className="flex flex-col">
        <span className="text-[11px] font-semibold text-foreground">DocuSigned by:</span>
        <span className="font-signature -mt-1 text-3xl leading-tight text-foreground">{name}</span>
        <span className="mt-1 text-[10px] tracking-wide text-muted-foreground">{referenceId}</span>
      </div>
      <div className="relative mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-sm border-2 border-primary/50">
        <span className="absolute -top-2.5 -right-1 rounded-sm bg-background px-0.5 text-[8px] font-bold text-primary">DS</span>
        <span className="font-signature text-lg leading-none text-foreground">{initials}</span>
      </div>
    </div>
  )
}
