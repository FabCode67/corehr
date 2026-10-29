"use client"

import Link from "next/link"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { resetPassword, type ResetPasswordState } from "./actions"

const initialState: ResetPasswordState = {}

export function ResetForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(resetPassword, initialState)

  return (
    <div
      className="flex min-h-svh items-center justify-center bg-muted/40 p-6"
      style={{ backgroundImage: "url(/background.svg)", backgroundSize: "cover", backgroundPosition: "center", backgroundRepeat: "no-repeat" }}
    >
      <Card className="w-full max-w-sm gap-0 overflow-hidden py-0">
        <div aria-hidden="true" className="h-2 w-full bg-primary" />
        <div className="flex flex-col gap-6 py-6">
          <CardHeader>
            <div className="mb-1 flex items-center gap-2.5">
              <img src="/ncba-mark.svg" alt="NCBA" className="size-8" />
              <span className="text-sm font-semibold text-foreground">NCBA Rwanda PeopleSuite</span>
            </div>
            <CardTitle className="text-xl">Set a new password</CardTitle>
            <CardDescription>Choose a password of at least 8 characters.</CardDescription>
          </CardHeader>

          {state?.done ? (
            <CardContent className="flex flex-col gap-4">
              <p className="rounded-md border border-border bg-muted/50 p-3 text-sm text-foreground">Your password has been changed. You can now sign in.</p>
              <Link href="/login" className="inline-flex h-9 items-center justify-center rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
                Go to sign in
              </Link>
            </CardContent>
          ) : (
            <form action={formAction}>
              <input type="hidden" name="token" value={token} />
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="newPassword">New password</Label>
                  <Input id="newPassword" name="newPassword" type="password" autoComplete="new-password" minLength={8} required />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="confirmPassword">Confirm new password</Label>
                  <Input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} required />
                </div>
                {state?.error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {state.error}{" "}
                    <Link href="/forgot-password" className="underline">
                      Request a new link
                    </Link>
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="pt-4">
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Saving…" : "Reset password"}
                </Button>
              </CardFooter>
            </form>
          )}
        </div>
      </Card>
    </div>
  )
}
