"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { Employee } from "@/lib/api/employees"
import type { Course } from "@/lib/api/learning"
import { createAssignment } from "@/lib/api/learning-actions"

export function AssignForm({
  employees,
  courses,
  actingEmployeeId,
}: {
  employees: Employee[]
  courses: Course[]
  actingEmployeeId: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(formData: FormData) {
    const employeeId = String(formData.get("employeeId") ?? "")
    const courseId = String(formData.get("courseId") ?? "")

    if (!employeeId || !courseId) {
      setError("Employee and course are required.")
      return
    }

    setError(null)
    startTransition(async () => {
      const result = await createAssignment(undefined, formData)
      if (result.error) {
        setError(result.error)
        return
      }
      router.push("/admin/learning/assignments")
    })
  }

  return (
    <form action={handleSubmit} className="flex flex-col gap-4">
      <input type="hidden" name="actingEmployeeId" value={actingEmployeeId} />

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
        <Label htmlFor="courseId">Course</Label>
        <Select id="courseId" name="courseId" defaultValue="" required>
          <option value="" disabled>
            Select…
          </option>
          {courses.map((course) => (
            <option key={course.id} value={course.id}>
              {course.name} ({course.courseCode}){course.category.isMandatory ? " — Mandatory" : ""}
            </option>
          ))}
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dueDate">Due date (optional)</Label>
          <Input id="dueDate" name="dueDate" type="date" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="priority">Priority</Label>
          <Select id="priority" name="priority" defaultValue="MEDIUM">
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
            <option value="CRITICAL">Critical</option>
          </Select>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="recommendationComment">Recommendation comment (optional)</Label>
        <Textarea
          id="recommendationComment"
          name="recommendationComment"
          placeholder='e.g. "Complete this course before taking ownership of the Digital Channels platform."'
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reasonForAssignment">Reason for assignment (optional)</Label>
        <Textarea id="reasonForAssignment" name="reasonForAssignment" />
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex justify-end">
        <Button type="submit" disabled={pending}>
          {pending ? "Assigning…" : "Assign course"}
        </Button>
      </div>
    </form>
  )
}
