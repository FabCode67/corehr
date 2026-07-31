"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { updateProfileSummary, type ActionState } from "@/lib/api/professional-profile-actions"

export function AboutSection({
  employeeId,
  professionalSummary,
  careerInterests,
  editable,
}: {
  employeeId: string
  professionalSummary: string | null
  careerInterests: string | null
  editable: boolean
}) {
  const updateAction = updateProfileSummary.bind(null, employeeId)
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(updateAction, undefined)

  if (!editable) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">About</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          <p className="text-muted-foreground">{professionalSummary || "No professional summary provided."}</p>
          {careerInterests ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase">Career interests</p>
              <p className="text-muted-foreground">{careerInterests}</p>
            </div>
          ) : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">About</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label htmlFor="professionalSummary" className="text-xs text-muted-foreground">
              Professional summary
            </Label>
            <Textarea id="professionalSummary" name="professionalSummary" rows={4} defaultValue={professionalSummary ?? ""} />
          </div>
          <div className="flex flex-col gap-1">
            <Label htmlFor="careerInterests" className="text-xs text-muted-foreground">
              Career interests
            </Label>
            <Textarea id="careerInterests" name="careerInterests" rows={2} defaultValue={careerInterests ?? ""} />
          </div>
          {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}
          {state?.success ? <p className="text-xs text-emerald-600">Saved.</p> : null}
          <Button type="submit" size="sm" disabled={pending} className="self-start">
            {pending ? "Saving…" : "Save"}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}
