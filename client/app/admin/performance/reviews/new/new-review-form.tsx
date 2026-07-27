"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Select } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import type { Employee } from "@/lib/api/employees"
import { createReview } from "@/lib/api/performance-actions"
import type { ReviewPeriod } from "@/lib/api/performance"

export function NewReviewForm({
  employees,
  periods,
  actingEmployeeId,
  basePath = "/admin/performance/reviews",
}: {
  employees: Employee[]
  periods: ReviewPeriod[]
  actingEmployeeId: string
  basePath?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    const employeeId = String(formData.get("employeeId") ?? "")
    const periodId = String(formData.get("periodId") ?? "")
    const reviewType = String(formData.get("reviewType") ?? "")
    const reviewerId = String(formData.get("reviewerId") ?? "")

    if (!employeeId || !periodId || !reviewType) {
      setError("Employee, period, and review type are required.")
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createReview({
        employeeId,
        periodId,
        reviewType: reviewType as "MID_YEAR" | "ANNUAL",
        actingEmployeeId,
        reviewerId: reviewerId || undefined,
      })
      if (result.error) {
        setError(result.error)
        return
      }
      if (result.id) router.push(`${basePath}/${result.id}`)
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="employeeId">Employee</Label>
        <Select id="employeeId" name="employeeId" defaultValue="" required>
          <option value="" disabled>
            Select…
          </option>
          {employees.map((employee) => (
            <option key={employee.employeeNumber} value={employee.employeeNumber}>
              {employee.firstName} {employee.lastName} ({employee.employeeNumber})
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="periodId">Review period</Label>
        <Select id="periodId" name="periodId" defaultValue="" required>
          <option value="" disabled>
            Select…
          </option>
          {periods.map((period) => (
            <option key={period.id} value={period.id}>
              {period.name}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reviewType">Review type</Label>
        <Select id="reviewType" name="reviewType" defaultValue="" required>
          <option value="" disabled>
            Select…
          </option>
          <option value="MID_YEAR">Mid-Year Review</option>
          <option value="ANNUAL">Annual Review</option>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reviewerId">Reviewer (optional — defaults to reporting manager)</Label>
        <Select id="reviewerId" name="reviewerId" defaultValue="">
          <option value="">Auto-detect reporting manager</option>
          {employees.map((employee) => (
            <option key={employee.employeeNumber} value={employee.employeeNumber}>
              {employee.firstName} {employee.lastName}
            </option>
          ))}
        </Select>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating…" : "Create review"}
        </Button>
      </div>
    </form>
  )
}
