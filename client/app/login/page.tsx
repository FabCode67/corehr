"use client"

import Link from "next/link"
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

import { login, type LoginState } from "./actions"

const initialState: LoginState = {}

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(login, initialState)

  return (
    <div
      className="flex min-h-svh items-center justify-center bg-muted/40 p-6"
      style={{
        backgroundImage: "url(/patterns/kitenge-light.svg)",
        backgroundSize: "140px 200px",
        backgroundRepeat: "repeat",
      }}
    >
      <Card className="w-full max-w-sm">
        <CardHeader>
          <div className="mb-1 flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
              NP
            </div>
            <span className="text-sm font-semibold text-foreground">
              NCBA Rwanda PeopleSuite
            </span>
          </div>
          <CardTitle className="text-xl">Sign in</CardTitle>
          <CardDescription>Access your Staff or Admin HR portal.</CardDescription>
        </CardHeader>

        <form action={formAction}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Work email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@ncbarwanda.com"
                autoComplete="email"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
            </div>

            {state?.error ? (
              <p role="alert" className="text-sm text-destructive">
                {state.error}
              </p>
            ) : null}

            <div className="rounded-md border border-dashed border-border bg-muted/50 p-3 text-xs text-muted-foreground">
              <p className="mb-1 font-medium text-foreground">Sign in as any active employee</p>
              <p>Default password for every account: Staff@123</p>
              <p className="mt-1">Try an admin: jp.mugisha@ncbarwanda.com</p>
              <p>Try staff: p.habimana@ncbarwanda.com</p>
            </div>
          </CardContent>

          <CardFooter className="flex flex-col gap-3">
            <Button type="submit" className="w-full" disabled={pending}>
              {pending ? "Signing in…" : "Sign in"}
            </Button>
            <Link
              href="/"
              className="text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Back to homepage
            </Link>
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
