"use client"

import { useActionState, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { RecruitmentActionState } from "@/lib/api/recruitment-actions"
import type { JdCompetency, JdContent, JdHeader } from "@/lib/jd-content"

const HEADER_FIELDS: { key: keyof JdHeader; label: string }[] = [
  { key: "jobTitle", label: "Job title" },
  { key: "reportsTo", label: "Reports to" },
  { key: "unit", label: "Unit" },
  { key: "division", label: "Division" },
  { key: "grade", label: "Grade" },
  { key: "date", label: "Date" },
  { key: "supervisor", label: "Supervisor" },
  { key: "jobHolder", label: "Job holder" },
]

const BULLET_HINT = "One item per line. Start a line with # to make it a bold sub-heading."

interface JdEditorProps {
  initial: JdContent
  action: (prevState: RecruitmentActionState | undefined, formData: FormData) => Promise<RecruitmentActionState>
  submitLabel: string
  /** Shown above the form, e.g. "Reused from the latest JD for this position". */
  notice?: string
}

function Section({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        {hint ? <CardDescription>{hint}</CardDescription> : null}
      </CardHeader>
      <CardContent className="flex flex-col gap-3">{children}</CardContent>
    </Card>
  )
}

function CompetencyList({
  items,
  onChange,
  namePlaceholder,
}: {
  items: JdCompetency[]
  onChange: (items: JdCompetency[]) => void
  namePlaceholder: string
}) {
  return (
    <>
      {items.map((item, i) => (
        <div key={i} className="grid gap-2 sm:grid-cols-[1fr_2fr_auto]">
          <Input
            value={item.name}
            placeholder={namePlaceholder}
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))}
          />
          <Input
            value={item.description}
            placeholder="What good looks like"
            onChange={(e) => onChange(items.map((x, j) => (j === i ? { ...x, description: e.target.value } : x)))}
          />
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">
            <Trash2 className="size-4" />
          </Button>
        </div>
      ))}
      <div>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...items, { name: "", description: "" }])}>
          <Plus className="mr-1 size-4" />
          Add
        </Button>
      </div>
    </>
  )
}

export function JdEditor({ initial, action, submitLabel, notice }: JdEditorProps) {
  const [state, formAction, pending] = useActionState<RecruitmentActionState | undefined, FormData>(action, undefined)
  const [c, setC] = useState<JdContent>(initial)
  const total = useMemo(() => c.kras.reduce((s, k) => s + (Number(k.weighting) || 0), 0), [c.kras])
  const set = <K extends keyof JdContent>(key: K, value: JdContent[K]) => setC((prev) => ({ ...prev, [key]: value }))

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="content" value={JSON.stringify(c)} />
      {notice ? <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">{notice}</p> : null}

      <Section title="Job details">
        <div className="grid gap-3 sm:grid-cols-2">
          {HEADER_FIELDS.map((f) => (
            <div key={f.key} className="flex flex-col gap-1.5">
              <Label htmlFor={`h-${f.key}`}>{f.label}</Label>
              <Input
                id={`h-${f.key}`}
                value={c.header[f.key]}
                required={f.key === "jobTitle"}
                onChange={(e) => set("header", { ...c.header, [f.key]: e.target.value })}
              />
            </div>
          ))}
        </div>
      </Section>

      <Section title="Job purpose statement" hint="One paragraph per line.">
        <Textarea rows={5} value={c.purpose} onChange={(e) => set("purpose", e.target.value)} />
      </Section>

      <Section title="Key result areas" hint={BULLET_HINT}>
        {c.kras.map((k, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
              <Input
                value={k.perspective}
                placeholder="Perspective"
                onChange={(e) => set("kras", c.kras.map((x, j) => (j === i ? { ...x, perspective: e.target.value } : x)))}
              />
              <div className="flex items-center gap-1">
                <Input
                  type="number"
                  min={0}
                  max={100}
                  value={k.weighting}
                  onChange={(e) => set("kras", c.kras.map((x, j) => (j === i ? { ...x, weighting: Number(e.target.value) } : x)))}
                />
                <span className="text-sm text-muted-foreground">%</span>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => set("kras", c.kras.filter((_, j) => j !== i))} aria-label="Remove row">
                <Trash2 className="size-4" />
              </Button>
            </div>
            <Textarea
              rows={5}
              value={k.output}
              placeholder={"# Sales and Revenue Growth\nAchieve monthly sales targets.\nSupport cross-selling."}
              onChange={(e) => set("kras", c.kras.map((x, j) => (j === i ? { ...x, output: e.target.value } : x)))}
            />
          </div>
        ))}
        <div className="flex items-center justify-between">
          <Button type="button" variant="outline" size="sm" onClick={() => set("kras", [...c.kras, { perspective: "", weighting: 0, output: "" }])}>
            <Plus className="mr-1 size-4" />
            Add row
          </Button>
          <p className={total === 100 ? "text-sm text-muted-foreground" : "text-sm font-medium text-destructive"}>Total weighting: {total}% (should be 100%)</p>
        </div>
      </Section>

      <Section title="Job dimensions">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Direct reports</Label>
            <Input value={c.directReports} onChange={(e) => set("directReports", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Indirect reports</Label>
            <Input value={c.indirectReports} onChange={(e) => set("indirectReports", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Internal stakeholders</Label>
            <Textarea rows={5} value={c.stakeholdersInternal} onChange={(e) => set("stakeholdersInternal", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>External stakeholders</Label>
            <Textarea rows={5} value={c.stakeholdersExternal} onChange={(e) => set("stakeholdersExternal", e.target.value)} />
          </div>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Decision making authority / mandates / constraints</Label>
          <Textarea rows={4} value={c.decisionAuthority} placeholder="Operational: …" onChange={(e) => set("decisionAuthority", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Work cycle and impact</Label>
          <Textarea rows={4} value={c.workCycle} placeholder="Daily/weekly: …" onChange={(e) => set("workCycle", e.target.value)} />
        </div>
      </Section>

      <Section title="Ideal job specifications" hint={BULLET_HINT}>
        <Textarea rows={9} value={c.specifications} onChange={(e) => set("specifications", e.target.value)} />
      </Section>

      <Section title="Technical competencies">
        <CompetencyList items={c.technicalCompetencies} onChange={(v) => set("technicalCompetencies", v)} namePlaceholder="Competency" />
      </Section>

      <Section title="Behavioural competencies">
        <CompetencyList items={c.behaviouralCompetencies} onChange={(v) => set("behaviouralCompetencies", v)} namePlaceholder="Competency" />
      </Section>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="sticky bottom-0 flex justify-end border-t border-border bg-background/95 py-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  )
}
