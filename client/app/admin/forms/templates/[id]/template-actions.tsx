"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { archiveFormTemplate, createNewTemplateVersion, publishFormTemplate } from "@/lib/api/forms-actions"
import type { FormStatus } from "@/lib/api/forms"

export function TemplateActions({ templateId, status, hasInstances }: { templateId: string; status: FormStatus; hasInstances: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<{ error?: string; id?: string }>, onSuccess?: (id?: string) => void) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) {
        setError(result.error)
        return
      }
      onSuccess?.(result?.id)
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {status === "DRAFT" ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => run(() => publishFormTemplate(templateId))}>
            {pending ? "Publishing…" : "Publish"}
          </Button>
        ) : null}
        {status === "ACTIVE" ? (
          <>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => archiveFormTemplate(templateId))}>
              {pending ? "Archiving…" : "Archive"}
            </Button>
            {hasInstances ? (
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={pending}
                onClick={() => run(() => createNewTemplateVersion(templateId), (id) => id && router.push(`/admin/forms/templates/${id}`))}
              >
                {pending ? "Creating…" : "Create new version"}
              </Button>
            ) : null}
          </>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      {status === "ACTIVE" && hasInstances ? (
        <p className="text-xs text-muted-foreground">
          Fields and signature stages are locked because this version already has form instances. Create a new version to make structural changes.
        </p>
      ) : null}
    </div>
  )
}
