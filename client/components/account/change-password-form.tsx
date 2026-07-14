"use client"

import { useActionState, useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { changePassword, type ChangePasswordState } from "@/lib/api/auth-actions"

export function ChangePasswordForm({ employeeId }: { employeeId: string }) {
  const [state, formAction, pending] = useActionState<ChangePasswordState | undefined, FormData>(
    changePassword.bind(null, employeeId),
    undefined
  )
  const [formKey, setFormKey] = useState(0)

  // Clear the fields after a successful change so the old password doesn't
  // linger in the inputs.
  useEffect(() => {
    if (state?.success) setFormKey((key) => key + 1)
  }, [state?.success])

  return (
    <form key={formKey} action={formAction} className="flex flex-col gap-4 sm:max-w-sm">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="currentPassword">Current password</Label>
        <Input
          id="currentPassword"
          name="currentPassword"
          type="password"
          autoComplete="current-password"
          required
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="newPassword">New password</Label>
        <Input
          id="newPassword"
          name="newPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
        <p className="text-xs text-muted-foreground">At least 8 characters.</p>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="confirmPassword">Confirm new password</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          minLength={8}
          required
        />
      </div>

      {state?.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state?.success ? <p className="text-sm text-emerald-600">Password updated.</p> : null}

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Updating…" : "Update password"}
        </Button>
      </div>
    </form>
  )
}
