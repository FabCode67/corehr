"use client"

import { useEffect, useRef, useState } from "react"

import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { updateReview } from "@/lib/api/performance-actions"
import type { PerformanceReview } from "@/lib/api/performance"

type Fields = {
  overallRating: string
  strengths: string
  achievements: string
  areasForImprovement: string
  goalsAchieved: string
  goalsNotAchieved: string
  behaviourCompetencies: string
  recommendedTraining: string
  developmentPlan: string
  managerComments: string
}

function toFields(review: PerformanceReview): Fields {
  return {
    overallRating: review.overallRating ? String(review.overallRating) : "",
    strengths: review.strengths ?? "",
    achievements: review.achievements ?? "",
    areasForImprovement: review.areasForImprovement ?? "",
    goalsAchieved: review.goalsAchieved ?? "",
    goalsNotAchieved: review.goalsNotAchieved ?? "",
    behaviourCompetencies: review.behaviourCompetencies ?? "",
    recommendedTraining: review.recommendedTraining ?? "",
    developmentPlan: review.developmentPlan ?? "",
    managerComments: review.managerComments ?? "",
  }
}

/**
 * Autosaves the draft ~1.5s after the last keystroke (debounced), matching
 * the spec's "Automatic saving of draft reviews" requirement without a
 * dedicated draft store — the PerformanceReview row itself is the draft
 * until submitted, same pattern as the Employee Registration wizard.
 */
export function ReviewForm({ review, actingEmployeeId }: { review: PerformanceReview; actingEmployeeId: string }) {
  const [fields, setFields] = useState<Fields>(() => toFields(review))
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isFirstRender = useRef(true)

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSaveState("saving")
    debounceRef.current = setTimeout(async () => {
      const result = await updateReview(review.id, actingEmployeeId, {
        overallRating: fields.overallRating ? Number(fields.overallRating) : undefined,
        strengths: fields.strengths,
        achievements: fields.achievements,
        areasForImprovement: fields.areasForImprovement,
        goalsAchieved: fields.goalsAchieved,
        goalsNotAchieved: fields.goalsNotAchieved,
        behaviourCompetencies: fields.behaviourCompetencies,
        recommendedTraining: fields.recommendedTraining,
        developmentPlan: fields.developmentPlan,
        managerComments: fields.managerComments,
      })
      setSaveState(result.error ? "error" : "saved")
    }, 1500)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields])

  function set<K extends keyof Fields>(key: K, value: Fields[K]) {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1.5 sm:w-56">
          <Label htmlFor="overallRating">Overall rating</Label>
          <Select
            id="overallRating"
            value={fields.overallRating}
            onChange={(event) => set("overallRating", event.target.value)}
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="5">5 — Outstanding</option>
            <option value="4">4 — Exceeded Expectations</option>
            <option value="3">3 — Succeeded</option>
            <option value="2">2 — Meets Some Expectations</option>
            <option value="1">1 — Unsatisfactory</option>
          </Select>
        </div>
        <p className="text-xs text-muted-foreground">
          {saveState === "saving" ? "Saving…" : saveState === "saved" ? "Saved" : saveState === "error" ? "Failed to save" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="strengths">Strengths</Label>
          <Textarea id="strengths" value={fields.strengths} onChange={(e) => set("strengths", e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="achievements">Achievements</Label>
          <Textarea
            id="achievements"
            value={fields.achievements}
            onChange={(e) => set("achievements", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="areasForImprovement">Areas for improvement</Label>
          <Textarea
            id="areasForImprovement"
            value={fields.areasForImprovement}
            onChange={(e) => set("areasForImprovement", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goalsAchieved">Goals achieved</Label>
          <Textarea
            id="goalsAchieved"
            value={fields.goalsAchieved}
            onChange={(e) => set("goalsAchieved", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="goalsNotAchieved">Goals not achieved</Label>
          <Textarea
            id="goalsNotAchieved"
            value={fields.goalsNotAchieved}
            onChange={(e) => set("goalsNotAchieved", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="behaviourCompetencies">Behaviour & competencies</Label>
          <Textarea
            id="behaviourCompetencies"
            value={fields.behaviourCompetencies}
            onChange={(e) => set("behaviourCompetencies", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="recommendedTraining">Recommended training</Label>
          <Textarea
            id="recommendedTraining"
            value={fields.recommendedTraining}
            onChange={(e) => set("recommendedTraining", e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="developmentPlan">Development plan</Label>
          <Textarea
            id="developmentPlan"
            value={fields.developmentPlan}
            onChange={(e) => set("developmentPlan", e.target.value)}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="managerComments">Manager comments</Label>
        <Textarea
          id="managerComments"
          value={fields.managerComments}
          onChange={(e) => set("managerComments", e.target.value)}
        />
      </div>
    </div>
  )
}
