"use client"

import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { completeFirstLogin, type CompleteFirstLoginState } from "./actions"

const initialState: CompleteFirstLoginState = {}

export function ChangePasswordForm({ name }: { name: string }) {
  const [state, formAction, pending] = useActionState(completeFirstLogin, initialState)

  return (
    <div
      className="flex min-h-svh items-center justify-center bg-muted/40 p-6"
      style={{
        backgroundImage: "url(/background.svg)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              NP
            </div>
            <span className="text-sm font-semibold text-foreground">NCBA Rwanda PeopleSuite</span>
          </div>
          <CardTitle className="text-xl">Welcome, {name.split(" ")[0]}</CardTitle>
          <CardDescription>
            For security, set a new password and accept the Terms of Use before continuing.
          </CardDescription>
        </CardHeader>

        <form action={formAction}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="currentPassword">Temporary password</Label>
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

            <div className="flex items-start gap-2 pt-1">
              <input
                id="termsAccepted"
                name="termsAccepted"
                type="checkbox"
                className="mt-1 size-4 rounded border-input"
                required
              />
              <Label htmlFor="termsAccepted" className="text-sm font-normal text-muted-foreground">
                I accept the NCBA Rwanda PeopleSuite Terms of Use and acknowledge my responsibility to
                keep my credentials confidential.
              </Label>
            </div>

            {state?.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Saving…" : "Set password and continue"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
