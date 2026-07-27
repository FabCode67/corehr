"use client"

import { useActionState, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { completeOnboarding, updateOnboardingTask, type RecruitmentActionState } from "@/lib/api/recruitment-actions"
import { ONBOARDING_TASK_LABELS, type OnboardingTask } from "@/lib/api/recruitment"

function TaskRow({ applicationId, actingEmployeeId, task }: { applicationId: string; actingEmployeeId: string; task: OnboardingTask }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const locked = task.taskType === "EMPLOYEE_NUMBER_CREATED"

  function toggle() {
    if (locked) return
    setError(null)
    startTransition(async () => {
      const result = await updateOnboardingTask(applicationId, task.taskType, actingEmployeeId, !task.isCompleted)
      if (result?.error) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <li className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
      <div className="flex items-center gap-2">
        <input type="checkbox" checked={task.isCompleted} disabled={pending || locked} onChange={toggle} className="size-4" />
        <span className={task.isCompleted ? "text-foreground" : "text-muted-foreground"}>{ONBOARDING_TASK_LABELS[task.taskType]}</span>
      </div>
      {task.isCompleted && task.completedBy ? (
        <span className="text-xs text-muted-foreground">
          {task.completedBy.firstName} {task.completedBy.lastName}
        </span>
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </li>
  )
}

function CompleteOnboardingForm({ applicationId, actingEmployeeId }: { applicationId: string; actingEmployeeId: string }) {
  const [state, formAction, pending] = useActionState<RecruitmentActionState | undefined, FormData>(completeOnboarding, undefined)

  return (
    <form action={formAction} className="flex flex-col gap-3 rounded-lg border border-dashed border-border p-3">
      <p className="text-xs font-medium text-muted-foreground">
        Every checklist item is complete — finish onboarding to create the real Employee record.
      </p>
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="actingEmployeeId" value={actingEmployeeId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gender">Gender</Label>
          <Select id="gender" name="gender" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input id="dateOfBirth" name="dateOfBirth" type="date" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nationalIdNumber">National ID number</Label>
          <Input id="nationalIdNumber" name="nationalIdNumber" required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maritalStatus">Marital status</Label>
          <Select id="maritalStatus" name="maritalStatus" required defaultValue="">
            <option value="" disabled>
              Select…
            </option>
            <option value="SINGLE">Single</option>
            <option value="MARRIED">Married</option>
            <option value="DIVORCED">Divorced</option>
            <option value="WIDOWED">Widowed</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="employmentStartDate">Employment start date (optional — defaults to the offer&apos;s start date)</Label>
          <Input id="employmentStartDate" name="employmentStartDate" type="date" />
        </div>
      </div>

      {state?.error ? <p className="text-xs text-destructive">{state.error}</p> : null}

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Creating employee…" : "Complete onboarding & create employee"}
        </Button>
      </div>
    </form>
  )
}

export function OnboardingSection({
  applicationId,
  actingEmployeeId,
  tasks,
  hiredEmployeeNumber,
}: {
  applicationId: string
  actingEmployeeId: string
  tasks: OnboardingTask[]
  hiredEmployeeNumber: string | null
}) {
  if (hiredEmployeeNumber) {
    return (
      <div className="flex flex-col gap-2">
        <Badge variant="success">Hired</Badge>
        <p className="text-sm text-foreground">
          Onboarding complete —{" "}
          <Link href={`/admin/employees/${hiredEmployeeNumber}`} className="text-primary hover:underline">
            view the employee record ({hiredEmployeeNumber})
          </Link>
          .
        </p>
      </div>
    )
  }

  if (tasks.length === 0) {
    return <p className="text-sm text-muted-foreground">Onboarding starts automatically once an offer is accepted.</p>
  }

  const outstanding = tasks.filter((task) => task.taskType !== "EMPLOYEE_NUMBER_CREATED" && !task.isCompleted)

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col gap-2">
        {tasks.map((task) => (
          <TaskRow key={task.id} applicationId={applicationId} actingEmployeeId={actingEmployeeId} task={task} />
        ))}
      </ul>
      {outstanding.length === 0 ? <CompleteOnboardingForm applicationId={applicationId} actingEmployeeId={actingEmployeeId} /> : null}
    </div>
  )
}
