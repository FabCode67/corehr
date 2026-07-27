import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Download } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchEmployees } from "@/lib/api/employees"
import {
  fetchFormInstance,
  fetchFormInstanceAuditLog,
  formInstancePdfUrl,
  INSTANCE_STATUS_LABELS,
  SIGNER_ROLE_LABELS,
  type FormInstanceStatus,
} from "@/lib/api/forms"
import { archiveFormInstance } from "@/lib/api/forms-actions"

import { FillForm } from "./fill-form"
import { SignaturePanel } from "./signature-panel"

const STATUS_VARIANT: Record<FormInstanceStatus, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  DRAFT: "outline",
  ASSIGNED: "outline",
  IN_PROGRESS: "default",
  SUBMITTED: "default",
  PENDING_SIGNATURES: "default",
  REJECTED: "destructive",
  COMPLETED: "success",
  ARCHIVED: "secondary",
}

const SIGNATURE_STATUS_VARIANT: Record<string, "outline" | "success" | "secondary" | "destructive" | "default"> = {
  PENDING: "outline",
  SIGNED: "success",
  REJECTED: "destructive",
  RETURNED_FOR_CORRECTION: "secondary",
}

const EDITABLE_STATUSES: FormInstanceStatus[] = ["DRAFT", "ASSIGNED", "IN_PROGRESS"]

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm text-foreground">{value}</p>
    </div>
  )
}

function formatResponseValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  if (Array.isArray(value)) {
    if (value.every((item) => typeof item !== "object" || item === null)) return value.join(", ")
    return value.map((row) => Object.entries(row as Record<string, unknown>).map(([key, val]) => `${key}: ${val}`).join(", ")).join(" | ")
  }
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

/**
 * Shared instance detail view — fill-in form, signature timeline (with
 * sign/reject/return actions for the acting employee's own pending
 * signature), PDF download, and audit history. Rendered from both the
 * admin portal (/admin/forms/instances/[id]) and the staff self-service
 * portal (/staff/forms/[id]) since either an HR admin or the assigned
 * employee/signer needs to reach the same instance — see middleware.ts's
 * admin/staff route split, which is why this lives as a plain shared
 * component rather than a page.
 */
export async function InstanceDetail({ id, actingEmployeeId, backHref, backLabel }: { id: string; actingEmployeeId: string; backHref: string; backLabel: string }) {
  const [instanceResult, auditLogResult, employeesResult] = await Promise.all([
    fetchFormInstance(id, actingEmployeeId),
    fetchFormInstanceAuditLog(id, actingEmployeeId),
    fetchEmployees(),
  ])

  if (!instanceResult.ok) {
    if (instanceResult.status === 404) notFound()
    return (
      <Card className="max-w-4xl border-dashed border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
          <CardDescription>{instanceResult.error}</CardDescription>
        </CardHeader>
      </Card>
    )
  }

  const instance = instanceResult.data
  const employees = employeesResult.ok ? employeesResult.data : []
  const isOwner = instance.employeeId === actingEmployeeId
  const canEdit = isOwner && EDITABLE_STATUSES.includes(instance.status)
  const mySignature = instance.signatures.find((signature) => signature.signerId === actingEmployeeId && signature.status === "PENDING")
  const canArchive = (instance.status === "COMPLETED" || instance.status === "REJECTED") && (isOwner || instance.assignedById === actingEmployeeId)
  const responseByFieldId = new Map(instance.responses.map((response) => [response.formFieldId, response.value]))
  const sortedFields = [...instance.formTemplate.fields].sort((a, b) => a.order - b.order)
  const sortedSignatures = [...instance.signatures].sort((a, b) => a.formSignatureStage.stageOrder - b.formSignatureStage.stageOrder)

  return (
    <div className="flex max-w-4xl flex-col gap-6">
      <div>
        <Link href={backHref} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-3.5" />
          {backLabel}
        </Link>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-semibold text-foreground">{instance.formTemplate.title}</h1>
          <div className="flex items-center gap-1.5">
            <Badge variant={STATUS_VARIANT[instance.status]}>{INSTANCE_STATUS_LABELS[instance.status]}</Badge>
            <Badge variant="outline">{instance.priority}</Badge>
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Details</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field label="Form" value={`${instance.formTemplate.formCode} (v${instance.formVersion})`} />
          <Field label="Category" value={instance.formTemplate.category.name} />
          <Field label="Employee" value={`${instance.employee.firstName} ${instance.employee.lastName}`} />
          <Field label="Assigned by" value={`${instance.assignedBy.firstName} ${instance.assignedBy.lastName}`} />
          <Field label="Assigned on" value={new Date(instance.assignmentDate).toLocaleDateString()} />
          <Field label="Due date" value={instance.dueDate ? new Date(instance.dueDate).toLocaleDateString() : "—"} />
          {instance.instructions ? <Field label="Instructions" value={instance.instructions} /> : null}
          {instance.rejectionComment ? <Field label="Rejection reason" value={instance.rejectionComment} /> : null}
        </CardContent>
      </Card>

      {instance.status === "COMPLETED" ? (
        <Card>
          <CardContent className="flex items-center justify-between py-4">
            <p className="text-sm text-foreground">This form is complete. Download the signed record as a PDF.</p>
            <a href={formInstancePdfUrl(instance.id, actingEmployeeId)} className={buttonVariants({ size: "sm", variant: "outline" })}>
              <Download className="mr-1 size-3.5" /> Download PDF
            </a>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Form responses</CardTitle>
        </CardHeader>
        <CardContent>
          {canEdit ? (
            <FillForm instance={instance} employees={employees} actingEmployeeId={actingEmployeeId} />
          ) : sortedFields.length === 0 ? (
            <p className="text-sm text-muted-foreground">This form has no fields.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sortedFields.map((field) => (
                <div key={field.id}>
                  <p className="text-xs text-muted-foreground">{field.label}</p>
                  <p className="text-sm text-foreground">{formatResponseValue(responseByFieldId.get(field.id))}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signature timeline</CardTitle>
          <CardDescription>Stages sharing the same order sign in parallel; later stages wait for earlier ones to finish.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sortedSignatures.length === 0 ? (
            <p className="text-sm text-muted-foreground">This form doesn&apos;t require any signatures.</p>
          ) : (
            sortedSignatures.map((signature) => (
              <div key={signature.id} className="flex flex-col gap-2">
                <div className="flex items-center justify-between rounded-lg border border-border p-3 text-sm">
                  <div>
                    <p className="font-medium text-foreground">
                      Stage {signature.formSignatureStage.stageOrder} — {signature.formSignatureStage.label ?? SIGNER_ROLE_LABELS[signature.formSignatureStage.role]}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {signature.signer ? `${signature.signer.firstName} ${signature.signer.lastName}` : "Not yet assigned"}
                      {signature.signedAt ? ` · ${new Date(signature.signedAt).toLocaleString()}` : ""}
                    </p>
                    {signature.comments ? <p className="mt-1 text-xs text-muted-foreground">&ldquo;{signature.comments}&rdquo;</p> : null}
                  </div>
                  <Badge variant={SIGNATURE_STATUS_VARIANT[signature.status]}>{signature.status.replaceAll("_", " ")}</Badge>
                </div>
                {mySignature?.id === signature.id ? <SignaturePanel signatureId={signature.id} actingEmployeeId={actingEmployeeId} /> : null}
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Audit history</CardTitle>
        </CardHeader>
        <CardContent>
          {!auditLogResult.ok || auditLogResult.data.length === 0 ? (
            <p className="text-sm text-muted-foreground">No audit entries yet.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {auditLogResult.data.map((entry) => (
                <li key={entry.id} className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0">
                  <span className="text-foreground">
                    {entry.action.replaceAll("_", " ")}
                    {entry.actor ? ` — ${entry.actor.firstName} ${entry.actor.lastName}` : ""}
                    {entry.notes ? `: ${entry.notes}` : ""}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canArchive ? (
        <form action={archiveFormInstance.bind(null, instance.id, actingEmployeeId)}>
          <button type="submit" className={buttonVariants({ size: "sm", variant: "outline" })}>
            Archive
          </button>
        </form>
      ) : null}
    </div>
  )
}
