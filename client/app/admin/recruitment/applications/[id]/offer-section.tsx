"use client"

import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { acceptOffer, createOffer, declineOffer, expireOffer, sendOffer, type RecruitmentActionState } from "@/lib/api/recruitment-actions"
import type { Band } from "@/lib/api/bands"
import type { Offer } from "@/lib/api/recruitment"

function OfferLifecycleActions({ offer, actingEmployeeId }: { offer: Offer; actingEmployeeId: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<{ error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        {offer.status === "DRAFT" ? (
          <Button type="button" size="sm" disabled={pending} onClick={() => run(() => sendOffer(offer.id, actingEmployeeId))}>
            {pending ? "Sending…" : "Send offer"}
          </Button>
        ) : null}
        {offer.status === "SENT" ? (
          <>
            <Button type="button" size="sm" disabled={pending} onClick={() => run(() => acceptOffer(offer.id, actingEmployeeId))}>
              {pending ? "Saving…" : "Mark accepted"}
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => declineOffer(offer.id, actingEmployeeId))}>
              Mark declined
            </Button>
            <Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => run(() => expireOffer(offer.id, actingEmployeeId))}>
              Mark expired
            </Button>
          </>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}

function NewOfferForm({ applicationId, actingEmployeeId, bands }: { applicationId: string; actingEmployeeId: string; bands: Band[] }) {
  const [state, formAction, pending] = useActionState<RecruitmentActionState | undefined, FormData>(createOffer, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">Create an offer</p>
      <input type="hidden" name="actingEmployeeId" value={actingEmployeeId} />
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="createdById" value={actingEmployeeId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="bandId">Band / salary grade</Label>
          <Select id="bandId" name="bandId" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            {bands.map((band) => (
              <option key={band.id} value={band.id}>
                {band.name}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contractType">Contract type</Label>
          <Select id="contractType" name="contractType" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            <option value="PERMANENT">Permanent</option>
            <option value="TEMPORARY">Temporary</option>
            <option value="GRADUATE_TRAINEE">Graduate Trainee</option>
            <option value="INTERN">Intern</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="proposedStartDate">Proposed start date</Label>
          <Input id="proposedStartDate" name="proposedStartDate" type="date" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="expiryDate">Offer expiry date</Label>
          <Input id="expiryDate" name="expiryDate" type="date" required />
        </div>
        <div className="flex flex-col gap-1.5 sm:col-span-2">
          <Label htmlFor="offerLetterUrl">Offer letter URL (optional)</Label>
          <Input id="offerLetterUrl" name="offerLetterUrl" />
        </div>
      </div>

      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Creating…" : "Create offer"}
        </Button>
      </div>
    </form>
  )
}

export function OfferSection({
  applicationId,
  actingEmployeeId,
  offers,
  bands,
}: {
  applicationId: string
  actingEmployeeId: string
  offers: Offer[]
  bands: Band[]
}) {
  const latest = offers[0]
  const canCreateNew = !latest || latest.status === "DECLINED" || latest.status === "EXPIRED"

  return (
    <div className="flex flex-col gap-3">
      {offers.length === 0 ? (
        <p className="text-sm text-muted-foreground">No offer created yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {offers.map((offer) => (
            <li key={offer.id} className="rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-medium text-foreground">{offer.band.name} · {offer.contractType.replaceAll("_", " ")}</span>
                <Badge
                  variant={
                    offer.status === "ACCEPTED" ? "success" : offer.status === "DECLINED" || offer.status === "EXPIRED" ? "destructive" : "outline"
                  }
                >
                  {offer.status}
                </Badge>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Start {new Date(offer.proposedStartDate).toLocaleDateString()} · Expires {new Date(offer.expiryDate).toLocaleDateString()}
              </p>
              <div className="mt-2">
                <OfferLifecycleActions offer={offer} actingEmployeeId={actingEmployeeId} />
              </div>
            </li>
          ))}
        </ul>
      )}
      {canCreateNew ? <NewOfferForm applicationId={applicationId} actingEmployeeId={actingEmployeeId} bands={bands} /> : null}
    </div>
  )
}
