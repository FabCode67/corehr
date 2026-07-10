import Link from "next/link"
import {
  CalendarClock,
  GraduationCap,
  LineChart,
  ShieldCheck,
  Users,
  Workflow,
} from "lucide-react"

import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

const FEATURES = [
  {
    icon: Users,
    title: "Employee Lifecycle",
    description:
      "Profiles, contracts, transfers, promotions, and a complete employment timeline in one record.",
  },
  {
    icon: CalendarClock,
    title: "Leave & Attendance",
    description:
      "Configurable leave types, approval workflows, timesheets, and real-time balances.",
  },
  {
    icon: LineChart,
    title: "Performance & Analytics",
    description:
      "KPIs, goals, reviews, and executive dashboards with drill-down reporting.",
  },
  {
    icon: GraduationCap,
    title: "Learning & Development",
    description:
      "Training catalog, certifications, expiry reminders, and a bank-wide skills matrix.",
  },
  {
    icon: Workflow,
    title: "Configurable Workflows",
    description:
      "Multi-level approvals for transfers, promotions, exits, and every other HR process.",
  },
  {
    icon: ShieldCheck,
    title: "Bank-Grade Security",
    description:
      "Role-based access control, complete audit trails, and encrypted, secure file storage.",
  },
]

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-md bg-primary text-sm font-semibold text-primary-foreground">
            NP
          </div>
          <span className="text-sm font-semibold text-foreground">
            NCBA Rwanda PeopleSuite
          </span>
        </div>
        <Link href="/login" className={buttonVariants({ size: "sm" })}>
          Sign in
        </Link>
      </header>

      <section className="relative overflow-hidden bg-primary">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-80"
          style={{
            backgroundImage: "url(/patterns/kitenge-dark.svg)",
            backgroundSize: "140px 200px",
            backgroundRepeat: "repeat",
          }}
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-24 text-center">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-secondary">
            Human Capital Management, built for the bank
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            One platform for every HR process at NCBA Bank Rwanda
          </h1>
          <p className="max-w-2xl text-balance text-white/80">
            NCBA Rwanda PeopleSuite centralizes the employee lifecycle, recruitment, leave,
            attendance, performance, and learning &amp; development — replacing spreadsheets and
            disconnected systems with one secure, auditable system of record.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Link href="/login" className={buttonVariants({ size: "lg", variant: "secondary" })}>
              Staff sign in
            </Link>
            <Link
              href="/login"
              className={cn(
                buttonVariants({ size: "lg", variant: "outline" }),
                "border-white/40 bg-transparent text-white hover:bg-white/10"
              )}
            >
              Admin sign in
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <div key={feature.title} className="rounded-xl border border-border p-5">
              <Icon className="mb-3 size-5 text-secondary" />
              <h3 className="mb-1 font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          )
        })}
      </section>

      <footer className="border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} NCBA Bank Rwanda. Internal use only.
      </footer>
    </div>
  )
}
