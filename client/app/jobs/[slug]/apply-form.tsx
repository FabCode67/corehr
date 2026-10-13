"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { applyToJob, type ApplyState } from "@/lib/api/public-jobs-actions"
import { APPLICATION_DOCUMENT_LABELS } from "@/lib/application-documents"

const ACCEPT = ".pdf,.doc,.docx,.jpg,.jpeg,.png"

function Field({ id, label, required, children }: { id: string; label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>
        {label}
        {required ? <span className="text-destructive"> *</span> : null}
      </Label>
      {children}
    </div>
  )
}

export function ApplyForm({ slug, requiredDocuments }: { slug: string; requiredDocuments: string[] }) {
  const [state, formAction, pending] = useActionState<ApplyState | undefined, FormData>(applyToJob.bind(null, slug), undefined)

  if (state?.success) {
    return (
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium text-foreground">Application received — thank you!</p>
        <p className="mt-1 text-muted-foreground">We&apos;ve sent a confirmation to your email. Our HR team will review your application and contact you about next steps.</p>
      </div>
    )
  }

  const docs = ["CV", ...requiredDocuments]
  const optionalDocs = ["COVER_LETTER", "OTHER"].filter((d) => !docs.includes(d))

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="firstName" label="First name" required>
          <Input id="firstName" name="firstName" required />
        </Field>
        <Field id="lastName" label="Last name" required>
          <Input id="lastName" name="lastName" required />
        </Field>
        <Field id="email" label="Email" required>
          <Input id="email" name="email" type="email" required />
        </Field>
        <Field id="phone" label="Phone" required>
          <Input id="phone" name="phone" type="tel" required />
        </Field>
        <Field id="nationality" label="Nationality" required>
          <Input id="nationality" name="nationality" required />
        </Field>
        <Field id="linkedinUrl" label="LinkedIn profile (optional)">
          <Input id="linkedinUrl" name="linkedinUrl" type="url" placeholder="https://linkedin.com/in/…" />
        </Field>
        <Field id="currentPosition" label="Current position (optional)">
          <Input id="currentPosition" name="currentPosition" />
        </Field>
        <Field id="currentEmployer" label="Current employer (optional)">
          <Input id="currentEmployer" name="currentEmployer" />
        </Field>
      </div>

      <Field id="education" label="Education">
        <Textarea id="education" name="education" rows={3} placeholder="Degrees, institutions, years" />
      </Field>
      <Field id="experience" label="Work experience">
        <Textarea id="experience" name="experience" rows={4} placeholder="Employers, roles, years" />
      </Field>
      <Field id="certifications" label="Professional certifications (optional)">
        <Textarea id="certifications" name="certifications" rows={2} />
      </Field>
      <Field id="skills" label="Key skills (optional)">
        <Textarea id="skills" name="skills" rows={2} />
      </Field>
      <Field id="coverNote" label="Anything else you'd like us to know (optional)">
        <Textarea id="coverNote" name="coverNote" rows={3} />
      </Field>

      <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
        <p className="text-sm font-medium">Documents</p>
        {docs.map((type) => (
          <Field key={type} id={type} label={APPLICATION_DOCUMENT_LABELS[type] ?? type} required>
            <input id={type} name={type} type="file" accept={ACCEPT} required className="text-sm" />
          </Field>
        ))}
        {optionalDocs.map((type) => (
          <Field key={type} id={type} label={`${APPLICATION_DOCUMENT_LABELS[type]} (optional)`}>
            <input id={type} name={type} type="file" accept={ACCEPT} className="text-sm" />
          </Field>
        ))}
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Submitting…" : "Submit application"}
        </Button>
      </div>
    </form>
  )
}
