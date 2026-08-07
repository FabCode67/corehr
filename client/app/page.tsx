import Image from "next/image"
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

export const metadata = {
  title: "NCBA Rwanda PeopleSuite",
  description: "Human Capital Management, built for NCBA Bank Rwanda.",
}

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

function SectionDivider() {
  return <div aria-hidden="true" className="h-6 w-full sm:h-8" style={{ backgroundColor: "#1c1311" }} />
}

export default function LandingPage() {
  return (
    <div className="min-h-svh bg-background">
      <header className="flex h-16 items-center justify-between border-b border-border px-6">
        <div className="flex items-center gap-2.5">
          <img src="/ncba-logo-dark.svg" alt="NCBA" className="h-7 w-auto" />
          <span className="hidden text-sm font-semibold text-foreground sm:inline">
            Rwanda PeopleSuite
          </span>
        </div>
        <Link href="/login" className={buttonVariants({ size: "sm" })}>
          Sign in
        </Link>
      </header>

      <section className="relative overflow-hidden bg-primary">
        <div
          aria-hidden="true"
          className="absolute inset-0 opacity-95"
          style={{
            backgroundImage: "url(/background.svg)",
            backgroundSize: "cover",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-primary/70 via-primary/55 to-primary" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-6 px-6 py-24 text-center">
          <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-secondary backdrop-blur-sm">
            Human Capital Management, built for the bank
          </span>
          <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            One platform for every HR process at NCBA Bank Rwanda
          </h1>
          <p className="max-w-2xl text-balance text-white/85">
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

      <SectionDivider />

      <section className="mx-auto max-w-5xl px-6 py-16">
        <div className="mx-auto mb-8 max-w-2xl text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Built for how NCBA Rwanda actually works
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            From head office to every branch counter — one system HR and staff can trust.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="group relative overflow-hidden rounded-2xl border border-border">
            <Image
              src="/ncba.jpg"
              alt="An NCBA Bank Rwanda branch"
              width={1000}
              height={664}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-sm font-medium text-white">A branch you know</p>
            </div>
          </div>
          <div className="group relative overflow-hidden rounded-2xl border border-border">
            <Image
              src="/IMG_5753.jpg"
              alt="NCBA Bank Rwanda serving customers"
              width={2560}
              height={1578}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-4">
              <p className="text-sm font-medium text-white">People behind every process</p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-6 pb-24 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => {
          const Icon = feature.icon
          return (
            <div
              key={feature.title}
              className="rounded-xl border border-border p-5 transition-shadow hover:shadow-md"
            >
              <Icon className="mb-3 size-5 text-secondary" />
              <h3 className="mb-1 font-semibold text-foreground">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          )
        })}
      </section>

      <SectionDivider />

      <footer className="flex flex-col items-center gap-2 border-t border-border px-6 py-6 text-center text-xs text-muted-foreground">
        <img src="/ncba-logo-dark.svg" alt="NCBA" className="h-5 w-auto opacity-70" />
        <span>© {new Date().getFullYear()} NCBA Bank Rwanda. Internal use only.</span>
      </footer>
    </div>
  )
}
