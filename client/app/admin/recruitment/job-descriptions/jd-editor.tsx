"use client"

import { useActionState, useMemo, useState } from "react"
import { Plus, Trash2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Textarea } from "@/components/ui/textarea"
import type { RecruitmentActionState } from "@/lib/api/recruitment-actions"
import type { JdCompetency, JdContent, JdHeader } from "@/lib/jd-content"
import { ACADEMIC_OPTIONS, COMMON_BEHAVIOURAL, COMMON_TECHNICAL, DECISION_OPTIONS, EXPERIENCE_OPTIONS, PROFESSIONAL_OPTIONS, WORK_CYCLE_OPTIONS } from "@/lib/jd-presets"

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

export interface JdLookups {
  positions: string[]
  departments: string[]
  units: string[]
  bands: string[]
}

interface JdEditorProps {
  lookups?: JdLookups
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

/** "Add common…" dropdown — appends the chosen line to a multi-line text block. */
function QuickAdd({ options, onPick, label }: { options: string[]; onPick: (line: string) => void; label: string }) {
  return (
    <Select
      value=""
      onChange={(e) => {
        if (e.target.value) onPick(e.target.value)
      }}
      className="h-8 text-xs"
    >
      <option value="">{label}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o.length > 90 ? `${o.slice(0, 90)}…` : o}
        </option>
      ))}
    </Select>
  )
}

const appendLine = (text: string, line: string) => (text.trim() ? `${text.replace(/\n+$/, "")}\n${line}` : line)

function CompetencyList({
  items,
  onChange,
  namePlaceholder,
  common,
}: {
  items: JdCompetency[]
  onChange: (items: JdCompetency[]) => void
  namePlaceholder: string
  common: JdCompetency[]
}) {
  const unused = common.filter((c) => !items.some((i) => i.name === c.name))
  return (
    <>
      <Select
        value=""
        onChange={(e) => {
          const pick = common.find((c) => c.name === e.target.value)
          if (!pick) return
          const blank = items.findIndex((i) => !i.name.trim() && !i.description.trim())
          onChange(blank >= 0 ? items.map((x, j) => (j === blank ? pick : x)) : [...items, pick])
        }}
        className="h-8 text-xs"
      >
        <option value="">Add a common competency…</option>
        {unused.map((c) => (
          <option key={c.name} value={c.name}>
            {c.name}
          </option>
        ))}
      </Select>
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

export function JdEditor({ initial, action, submitLabel, notice, lookups = { positions: [], departments: [], units: [], bands: [] } }: JdEditorProps) {
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
          {HEADER_FIELDS.map((f) => {
            const dropdown: Partial<Record<keyof JdHeader, string[]>> = {
              reportsTo: lookups.positions,
              supervisor: lookups.positions,
              unit: lookups.units,
              division: lookups.departments,
              grade: lookups.bands,
            }
            const options = dropdown[f.key]
            const current = c.header[f.key]
            return (
              <div key={f.key} className="flex flex-col gap-1.5">
                <Label htmlFor={`h-${f.key}`}>{f.label}</Label>
                {options && options.length > 0 ? (
                  <SearchableSelect
                    options={[...new Set([...(current && !options.includes(current) ? [current] : []), ...options])].map((o) => ({ value: o, label: o }))}
                    value={current}
                    onValueChange={(v) => set("header", { ...c.header, [f.key]: v })}
                    placeholder={`Select ${f.label.toLowerCase()}…`}
                    searchPlaceholder="Search…"
                  />
                ) : (
                  <Input
                    id={`h-${f.key}`}
                    value={current}
                    required={f.key === "jobTitle"}
                    type={f.key === "date" ? "date" : "text"}
                    onChange={(e) => set("header", { ...c.header, [f.key]: e.target.value })}
                  />
                )}
              </div>
            )
          })}
        </div>
      </Section>

      <Section title="Job purpose statement" hint="One paragraph per line.">
        <Textarea rows={5} value={c.purpose} onChange={(e) => set("purpose", e.target.value)} />
      </Section>

      <Section title="Key result areas" hint={BULLET_HINT}>
        {c.kras.map((k, i) => (
          <div key={i} className="flex flex-col gap-2 rounded-lg border border-border p-3">
            <div className="grid gap-2 sm:grid-cols-[2fr_1fr_auto]">
              <Select value={k.perspective} onChange={(e) => set("kras", c.kras.map((x, j) => (j === i ? { ...x, perspective: e.target.value } : x)))}>
                {[...new Set([k.perspective, "Financial", "Customer", "Internal business processes", "Learning and growth"].filter(Boolean))].map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
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

      <datalist id="jd-positions">
        <option value="None" />
        {lookups.positions.map((p) => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <Section title="Job dimensions">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label>Direct reports</Label>
            <Input list="jd-positions" value={c.directReports} onChange={(e) => set("directReports", e.target.value)} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Indirect reports</Label>
            <Input list="jd-positions" value={c.indirectReports} onChange={(e) => set("indirectReports", e.target.value)} />
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
          <QuickAdd options={DECISION_OPTIONS} label="Add a common statement…" onPick={(l) => set("decisionAuthority", appendLine(c.decisionAuthority, l))} />
          <Textarea rows={4} value={c.decisionAuthority} placeholder="Operational: …" onChange={(e) => set("decisionAuthority", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Work cycle and impact</Label>
          <QuickAdd options={WORK_CYCLE_OPTIONS} label="Add a common statement…" onPick={(l) => set("workCycle", appendLine(c.workCycle, l))} />
          <Textarea rows={4} value={c.workCycle} placeholder="Daily/weekly: …" onChange={(e) => set("workCycle", e.target.value)} />
        </div>
      </Section>

      <Section title="Ideal job specifications" hint={BULLET_HINT}>
        <div className="grid gap-2 sm:grid-cols-3">
          <QuickAdd options={ACADEMIC_OPTIONS} label="+ Academic…" onPick={(l) => set("specifications", appendLine(c.specifications, l))} />
          <QuickAdd options={PROFESSIONAL_OPTIONS} label="+ Professional…" onPick={(l) => set("specifications", appendLine(c.specifications, l))} />
          <QuickAdd options={EXPERIENCE_OPTIONS} label="+ Experience…" onPick={(l) => set("specifications", appendLine(c.specifications, l))} />
        </div>
        <Textarea rows={9} value={c.specifications} onChange={(e) => set("specifications", e.target.value)} />
      </Section>

      <Section title="Technical competencies">
        <CompetencyList items={c.technicalCompetencies} onChange={(v) => set("technicalCompetencies", v)} namePlaceholder="Competency" common={COMMON_TECHNICAL} />
      </Section>

      <Section title="Behavioural competencies">
        <CompetencyList items={c.behaviouralCompetencies} onChange={(v) => set("behaviouralCompetencies", v)} namePlaceholder="Competency" common={COMMON_BEHAVIOURAL} />
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
