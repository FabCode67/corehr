"use client"

import { useState, useTransition } from "react"
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

import { Button } from "@/components/ui/button"
import type { ChatArtifact } from "@/lib/api/ai-assistant"

import { confirmActionAction, rejectActionAction } from "./actions"

const COLORS = ["#0A2647", "#B8860B", "#3B2412", "#2E7D6B", "#7F77DD", "#D85A30", "#5DCAA5", "#D4537E"]

function ChartArtifact({ artifact }: { artifact: Extract<ChatArtifact, { type: "chart" }> }) {
  const nameKey = artifact.nameKey ?? "name"
  const dataKey = artifact.dataKey ?? "value"
  if (artifact.data.length === 0) return <p className="text-xs text-muted-foreground">No data to chart.</p>

  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <p className="mb-2 text-xs font-medium text-foreground">{artifact.title}</p>
      <ResponsiveContainer width="100%" height={220}>
        {artifact.chartType === "pie" || artifact.chartType === "donut" ? (
          <PieChart>
            <Pie data={artifact.data} dataKey={dataKey} nameKey={nameKey} innerRadius={artifact.chartType === "donut" ? 45 : 0} outerRadius={80} paddingAngle={2}>
              {artifact.data.map((_, index) => (
                <Cell key={index} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Legend wrapperStyle={{ fontSize: 10 }} />
            <Tooltip />
          </PieChart>
        ) : artifact.chartType === "line" ? (
          <LineChart data={artifact.data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Line type="monotone" dataKey={dataKey} stroke="#0A2647" strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        ) : artifact.chartType === "area" ? (
          <AreaChart data={artifact.data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Area type="monotone" dataKey={dataKey} stroke="#0A2647" fill="#0A264733" strokeWidth={2} />
          </AreaChart>
        ) : (
          <BarChart data={artifact.data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey={nameKey} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip />
            <Bar dataKey={dataKey} fill="#0A2647" radius={[4, 4, 0, 0]} />
          </BarChart>
        )}
      </ResponsiveContainer>
    </div>
  )
}

function TableArtifact({ artifact }: { artifact: Extract<ChatArtifact, { type: "table" }> }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted">
          <tr>
            {artifact.columns.map((col) => (
              <th key={col} className="px-3 py-1.5 text-left font-medium text-muted-foreground">
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {artifact.rows.map((row, i) => (
            <tr key={i} className="border-t border-border">
              {row.map((cell, j) => (
                <td key={j} className="px-3 py-1.5 text-foreground">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReportLinkArtifact({ artifact }: { artifact: Extract<ChatArtifact, { type: "report_link" }> }) {
  return (
    <a
      href={artifact.url}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-xs font-medium text-foreground hover:bg-muted"
    >
      Download {artifact.title} ({artifact.format.toUpperCase()})
    </a>
  )
}

function PendingActionArtifact({ artifact, actingEmployeeId, isAdmin }: { artifact: Extract<ChatArtifact, { type: "pending_action" }>; actingEmployeeId: string; isAdmin: boolean }) {
  const [status, setStatus] = useState<"PENDING" | "EXECUTED" | "REJECTED" | "FAILED">("PENDING")
  const [resultMessage, setResultMessage] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  if (!isAdmin) return null

  if (status !== "PENDING") {
    return (
      <div className="rounded-lg border border-border bg-card p-3 text-xs">
        <p className="font-medium text-foreground">{artifact.description}</p>
        <p className={`mt-1 ${status === "EXECUTED" ? "text-emerald-600" : status === "FAILED" ? "text-destructive" : "text-muted-foreground"}`}>
          {status === "EXECUTED" ? `Done — ${resultMessage ?? "action completed."}` : status === "FAILED" ? `Failed — ${resultMessage}` : "Rejected."}
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-xs dark:border-amber-800 dark:bg-amber-950/30">
      <p className="font-medium text-foreground">Confirmation needed: {artifact.description}</p>
      <div className="mt-2 flex gap-2">
        <Button
          type="button"
          size="sm"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await confirmActionAction(artifact.id, actingEmployeeId)
              if (result.ok) {
                setStatus(result.data.status === "EXECUTED" ? "EXECUTED" : "FAILED")
                setResultMessage(result.data.resultSummary)
              } else {
                setResultMessage(result.error)
                setStatus("FAILED")
              }
            })
          }
        >
          {isPending ? "Confirming…" : "Confirm"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={isPending}
          onClick={() =>
            startTransition(async () => {
              const result = await rejectActionAction(artifact.id, actingEmployeeId)
              if (result.ok) {
                setStatus("REJECTED")
              } else {
                setResultMessage(result.error)
                setStatus("FAILED")
              }
            })
          }
        >
          Reject
        </Button>
      </div>
    </div>
  )
}

export function ArtifactRenderer({ artifacts, actingEmployeeId, isAdmin }: { artifacts: ChatArtifact[]; actingEmployeeId: string; isAdmin: boolean }) {
  if (artifacts.length === 0) return null
  return (
    <div className="mt-2 flex flex-col gap-2">
      {artifacts.map((artifact, i) => {
        if (artifact.type === "chart") return <ChartArtifact key={i} artifact={artifact} />
        if (artifact.type === "table") return <TableArtifact key={i} artifact={artifact} />
        if (artifact.type === "report_link") return <ReportLinkArtifact key={i} artifact={artifact} />
        if (artifact.type === "pending_action") return <PendingActionArtifact key={i} artifact={artifact} actingEmployeeId={actingEmployeeId} isAdmin={isAdmin} />
        return null
      })}
    </div>
  )
}
