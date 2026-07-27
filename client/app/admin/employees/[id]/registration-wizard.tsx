"use client"

import { useState } from "react"
import { Check } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { Band } from "@/lib/api/bands"
import type { Branch } from "@/lib/api/branches"
import type { Department } from "@/lib/api/departments"
import type { Employee, PositionHistoryEntry, ReportingManagerResult } from "@/lib/api/employees"
import type { Position } from "@/lib/api/positions"

import type { ActionState } from "../actions"
import { BasicInfoForm } from "../employee-form"
import { BandForm } from "./band-form"
import { ChildrenSection } from "./children-section"
import { EducationSection } from "./education-section"
import { EmploymentDetailsForm } from "./employment-details-form"
import { PartnerForm } from "./partner-form"
import { PositionAssignmentForm } from "./position-assignment-form"
import { TransferForm } from "./transfer-form"

type StepId = "basic" | "employment" | "position" | "family" | "education"

type BoundAction = (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>

interface RegistrationWizardProps {
  employee: Employee
  departments: Department[]
  positions: Position[]
  bands: Band[]
  branches: Branch[]
  employeesForPreview: Pick<Employee, "employeeNumber" | "firstName" | "lastName" | "positionId" | "isActive">[]
  history: PositionHistoryEntry[]
  reportingManager: ReportingManagerResult | null
  actions: {
    updateBasicInfo: BoundAction
    updateEmploymentDetails: BoundAction
    assignPosition: BoundAction
    transferEmployee: BoundAction
    changeEmployeeBand: BoundAction
    updatePartner: BoundAction
    addChild: BoundAction
    removeChild: (childId: string) => Promise<void>
    addEducation: BoundAction
    removeEducation: (educationId: string) => Promise<void>
  }
}

export function RegistrationWizard({
  employee,
  departments,
  positions,
  bands,
  branches,
  employeesForPreview,
  history,
  reportingManager,
  actions,
}: RegistrationWizardProps) {
  const steps: { id: StepId; label: string; required: boolean; hasData: boolean }[] = [
    { id: "basic", label: "Basic Information", required: true, hasData: true },
    { id: "position", label: "Position Assignment", required: false, hasData: Boolean(employee.positionId) },
    {
      id: "employment",
      label: "Employment Details",
      required: false,
      hasData: Boolean(employee.contractType || employee.employmentStartDate),
    },
    {
      id: "family",
      label: "Family Information",
      required: false,
      hasData: Boolean(employee.partnerName || (employee.children?.length ?? 0) > 0),
    },
    {
      id: "education",
      label: "Education & Development",
      required: false,
      hasData: (employee.education?.length ?? 0) > 0,
    },
  ]

  const [activeStep, setActiveStep] = useState<StepId>("basic")

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        {steps.map((step, index) => {
          const isActive = step.id === activeStep
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => setActiveStep(step.id)}
              className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                isActive
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background text-muted-foreground hover:text-foreground"
              }`}
            >
              <span
                className={`flex size-4 items-center justify-center rounded-full text-[10px] ${
                  isActive
                    ? "bg-primary-foreground text-primary"
                    : step.hasData
                      ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                      : "bg-muted text-muted-foreground"
                }`}
              >
                {step.hasData ? <Check className="size-2.5" /> : index + 1}
              </span>
              {step.label}
              {step.required ? <span className="text-[10px] opacity-70">(required)</span> : null}
            </button>
          )
        })}
      </div>

      {activeStep === "basic" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 1 · Basic Information</CardTitle>
            <CardDescription>The only required step — everything else is optional.</CardDescription>
          </CardHeader>
          <CardContent>
            <BasicInfoForm
              employee={employee}
              branches={branches}
              action={actions.updateBasicInfo}
              submitLabel="Save changes"
            />
          </CardContent>
        </Card>
      ) : null}

      {activeStep === "employment" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 3 · Employment Details</CardTitle>
            <CardDescription>Optional — contract type, start date, and prior bank history.</CardDescription>
          </CardHeader>
          <CardContent>
            <EmploymentDetailsForm employee={employee} action={actions.updateEmploymentDetails} />
          </CardContent>
        </Card>
      ) : null}

      {activeStep === "position" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 2 · Position Assignment</CardTitle>
            <CardDescription>
              Optional — assigns this employee to the org structure and Band.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            {employee.position && employee.band ? (
              <div className="rounded-lg border border-border p-4">
                <p className="text-sm font-medium text-foreground">
                  {employee.position.title}
                  {employee.position.unit ? ` — ${employee.position.unit.name}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {employee.position.department.name} · Band {employee.band.name}
                </p>
                {reportingManager?.manager ? (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Reports to{" "}
                    <span className="text-foreground">
                      {reportingManager.manager.firstName} {reportingManager.manager.lastName}
                    </span>
                  </p>
                ) : reportingManager ? (
                  <p className="mt-1 text-xs text-muted-foreground">No reporting manager on record.</p>
                ) : null}
              </div>
            ) : (
              <PositionAssignmentForm
                departments={departments}
                positions={positions}
                bands={bands}
                employees={employeesForPreview}
                action={actions.assignPosition}
              />
            )}

            {employee.positionId && employee.bandId ? (
              <div className="flex flex-col gap-6 border-t border-border pt-6">
                <div>
                  <h3 className="text-sm font-medium text-foreground">Record a transfer / promotion</h3>
                  <p className="text-xs text-muted-foreground">
                    For formal changes after onboarding — this opens a new position-history record.
                  </p>
                  <div className="mt-3">
                    <TransferForm
                      positions={positions}
                      currentPositionId={employee.positionId}
                      action={actions.transferEmployee}
                    />
                  </div>
                </div>
                <div>
                  <h3 className="text-sm font-medium text-foreground">Change band</h3>
                  <div className="mt-3">
                    <BandForm
                      bands={bands}
                      currentBandId={employee.bandId}
                      action={actions.changeEmployeeBand}
                    />
                  </div>
                </div>
                {history.length > 0 ? (
                  <div>
                    <h3 className="text-sm font-medium text-foreground">Position history</h3>
                    <ul className="mt-3 flex flex-col gap-2">
                      {history.map((entry) => (
                        <li
                          key={entry.id}
                          className="border-b border-border pb-2 text-xs text-muted-foreground last:border-0"
                        >
                          <Badge variant="secondary" className="mr-2">
                            {entry.changeType.replaceAll("_", " ")}
                          </Badge>
                          {entry.position.title} · Band {entry.band.name} · from{" "}
                          {entry.effectiveFrom.slice(0, 10)}
                          {entry.effectiveTo ? ` to ${entry.effectiveTo.slice(0, 10)}` : ""}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            ) : null}
          </CardContent>
        </Card>
      ) : null}

      {activeStep === "family" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 4 · Family Information</CardTitle>
            <CardDescription>Optional — partner and children.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-6">
            <PartnerForm employee={employee} action={actions.updatePartner} />
            <div className="border-t border-border pt-6">
              <ChildrenSection
                children={employee.children ?? []}
                addAction={actions.addChild}
                onRemove={actions.removeChild}
              />
            </div>
          </CardContent>
        </Card>
      ) : null}

      {activeStep === "education" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Step 5 · Education &amp; Professional Development</CardTitle>
            <CardDescription>Optional — unlimited records.</CardDescription>
          </CardHeader>
          <CardContent>
            <EducationSection
              education={employee.education ?? []}
              addAction={actions.addEducation}
              onRemove={actions.removeEducation}
            />
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
