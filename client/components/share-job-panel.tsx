"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"

/** Public job link plus one-click share targets. Instagram has no web share
 *  URL, so it (like any other network) uses the copy-link button. */
export function ShareJobPanel({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false)
  const text = `We're hiring: ${title}`
  const targets = [
    { label: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
    { label: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}` },
    { label: "X / Twitter", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
    { label: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { label: "Email", href: `mailto:?subject=${encodeURIComponent(text)}&body=${encodeURIComponent(url)}` },
  ]

  async function copy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      window.prompt("Copy this link", url)
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input readOnly value={url} onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm" />
        <Button type="button" size="sm" onClick={copy}>
          {copied ? <Check className="mr-1.5 size-4" /> : <Copy className="mr-1.5 size-4" />}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <div className="flex flex-wrap gap-2">
        {targets.map((t) => (
          <a key={t.label} href={t.href} target="_blank" rel="noopener noreferrer" className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted">
            {t.label}
          </a>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">For Instagram, copy the link and paste it into your bio, story link sticker or post.</p>
    </div>
  )
}
