"use client"

import Image from "next/image"
import { useActionState, useRef, useState, type ChangeEvent } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import type { Branch } from "@/lib/api/branches"
import type { Employee } from "@/lib/api/employees"
import { uploadFile } from "@/lib/api/uploads"

import type { ActionState } from "./actions"

interface BasicInfoFormProps {
  employee?: Employee
  branches: Branch[]
  action: (prevState: ActionState | undefined, formData: FormData) => Promise<ActionState>
  submitLabel: string
}

/**
 * Step 1 of the Employee Registration wizard — Basic Information. This is
 * the only required step; shared between the "New employee" page (create)
 * and the wizard's Basic Information tab (edit) via the optional `employee`
 * prop, same dual-use pattern as PositionForm/DepartmentForm.
 */
export function BasicInfoForm({ employee, branches, action, submitLabel }: BasicInfoFormProps) {
  const [state, formAction, pending] = useActionState<ActionState | undefined, FormData>(
    action,
    undefined
  )

  const [pictureUrl, setPictureUrl] = useState(employee?.profilePictureUrl ?? "")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)
    setUploadError(null)
    const result = await uploadFile("profile-pictures", file)
    setUploading(false)

    if (!result.ok) {
      setUploadError(result.error)
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    setPictureUrl(result.url)
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <input type="hidden" name="profilePictureUrl" value={pictureUrl} />

      <div className="flex items-center gap-4">
        {pictureUrl ? (
          <Image
            src={pictureUrl}
            alt="Profile preview"
            width={64}
            height={64}
            className="size-16 rounded-full border border-border object-cover"
            unoptimized
          />
        ) : (
          <div className="flex size-16 items-center justify-center rounded-full border border-dashed border-border text-xs text-muted-foreground">
            No photo
          </div>
        )}
        <div className="flex flex-col gap-1">
          <Label htmlFor="profilePicture">Profile picture (optional)</Label>
          <input
            ref={fileInputRef}
            id="profilePicture"
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="text-xs text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-secondary file:px-2.5 file:py-1 file:text-xs file:font-medium"
          />
          {uploading ? <p className="text-xs text-muted-foreground">Uploading…</p> : null}
          {uploadError ? <p className="text-xs text-destructive">{uploadError}</p> : null}
        </div>
      </div>

      {!employee ? (
        <div className="flex flex-col gap-1.5 sm:w-1/3">
          <Label htmlFor="employeeNumber">Staff ID (optional)</Label>
          <Input
            id="employeeNumber"
            name="employeeNumber"
            placeholder="e.g. EMP-0123 — leave blank to auto-generate"
            pattern="[A-Za-z0-9][A-Za-z0-9._\-]{0,29}"
            maxLength={30}
            title="Start with a letter or number; letters, numbers, '.', '_', '-' only; up to 30 characters."
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to auto-generate the next EMP-#### number. Only set this to preserve a known staff ID —
            e.g. one carried over from a previous system.
          </p>
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" defaultValue={employee?.firstName} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="middleName">Middle name (optional)</Label>
          <Input id="middleName" name="middleName" defaultValue={employee?.middleName ?? ""} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" defaultValue={employee?.lastName} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:w-1/3">
        <Label htmlFor="preferredName">Preferred name (optional)</Label>
        <Input id="preferredName" name="preferredName" defaultValue={employee?.preferredName ?? ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="gender">Gender</Label>
          <Select id="gender" name="gender" defaultValue={employee?.gender ?? ""} required>
            <option value="" disabled>
              Select…
            </option>
            <option value="MALE">Male</option>
            <option value="FEMALE">Female</option>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dateOfBirth">Date of birth</Label>
          <Input
            id="dateOfBirth"
            name="dateOfBirth"
            type="date"
            defaultValue={employee?.dateOfBirth?.slice(0, 10)}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="maritalStatus">Marital status</Label>
          <Select
            id="maritalStatus"
            name="maritalStatus"
            defaultValue={employee?.maritalStatus ?? ""}
            required
          >
            <option value="" disabled>
              Select…
            </option>
            <option value="SINGLE">Single</option>
            <option value="MARRIED">Married</option>
            <option value="DIVORCED">Divorced</option>
            <option value="WIDOWED">Widowed</option>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nationalIdNumber">National ID / Passport number</Label>
          <Input
            id="nationalIdNumber"
            name="nationalIdNumber"
            defaultValue={employee?.nationalIdNumber}
            required
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="nationality">Nationality</Label>
          <Input
            id="nationality"
            name="nationality"
            defaultValue={employee?.nationality ?? "Rwandan"}
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email">Email address</Label>
          <Input id="email" name="email" type="email" defaultValue={employee?.email} required />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone">Phone number</Label>
          <Input id="phone" name="phone" type="tel" defaultValue={employee?.phone} required />
        </div>
      </div>

      <div className="flex flex-col gap-1.5 sm:w-1/2">
        <Label htmlFor="branchId">Work location / Branch</Label>
        <Select
          id="branchId"
          name="branchId"
          defaultValue={employee?.branchId ?? ""}
          required
        >
          <option value="" disabled>
            Select…
          </option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </Select>
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending || uploading}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  )
}
