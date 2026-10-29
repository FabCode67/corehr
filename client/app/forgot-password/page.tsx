"use client"

import Link from "next/link"
import { useActionState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

import { requestPasswordReset, type ForgotPasswordState } from "./actions"

const initialState: ForgotPasswordState = {}

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(requestPasswordReset, initialState)

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
            <CardTitle className="text-xl">Forgot password</CardTitle>
            <CardDescription>Enter your work email and we&apos;ll send you a link to reset your password.</CardDescription>
          </CardHeader>

          {state?.sent ? (
            <CardContent className="flex flex-col gap-4">
              <p className="rounded-md border border-border bg-muted/50 p-3 text-sm text-foreground">
                If that email belongs to an account, a reset link is on its way. It is valid for 30 minutes — check your inbox and spam folder.
              </p>
              <Link href="/login" className="text-center text-sm font-medium text-primary hover:underline">
                Back to sign in
              </Link>
            </CardContent>
          ) : (
            <form action={formAction}>
              <CardContent className="flex flex-col gap-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="email">Work email</Label>
                  <Input id="email" name="email" type="email" placeholder="you@ncbarwanda.com" autoComplete="email" required />
                </div>
                {state?.error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {state.error}
                  </p>
                ) : null}
              </CardContent>
              <CardFooter className="flex flex-col gap-3 pt-4">
                <Button type="submit" className="w-full" disabled={pending}>
                  {pending ? "Sending…" : "Send reset link"}
                </Button>
                <Link href="/login" className="text-xs text-muted-foreground transition-colors hover:text-foreground">
                  Back to sign in
                </Link>
              </CardFooter>
            </form>
          )}
        </div>
      </Card>
    </div>
  )
}
