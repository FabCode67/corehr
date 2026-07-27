"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { createCandidate, type RecruitmentActionState } from "@/lib/api/recruitment-actions"

export function CandidateForm({ action }: { action: typeof createCandidate }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [state, setState] = useState<RecruitmentActionState>({})

  function handleSubmit(formData: FormData) {
    setState({})
    startTransition(async () => {
      const result = await action(undefined, formData)
      if (result.error) {
        setState(result)
        return
      }
      router.push(`/admin/recruitment/candidates/${result.id}`)
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nationality">Nationality</Label>
          <Input id="nationality" name="nationality" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="cvUrl">CV URL (optional)</Label>
          <Input id="cvUrl" name="cvUrl" />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="education">Education (optional)</Label>
        <Textarea id="education" name="education" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="experience">Experience (optional)</Label>
        <Textarea id="experience" name="experience" />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="skills">Skills (optional)</Label>
        <Textarea id="skills" name="skills" />
      </div>

      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Create candidate"}
        </Button>
      </div>
    </form>
  )
}
