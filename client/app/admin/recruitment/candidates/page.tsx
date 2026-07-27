import Link from "next/link"

import { buttonVariants } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { fetchCandidates } from "@/lib/api/recruitment"

import { RecruitmentTabs } from "../recruitment-tabs"

export default async function CandidatesPage({ searchParams }: { searchParams: Promise<{ search?: string }> }) {
  const { search } = await searchParams
  const result = await fetchCandidates(search)
  const candidates = result.ok ? result.data : []

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Recruitment Management</h1>
          <p className="text-sm text-muted-foreground">The candidate directory — people who have applied to one or more postings.</p>
        </div>
        <Link href="/admin/recruitment/candidates/new" className={buttonVariants({ size: "sm" })}>
          New candidate
        </Link>
      </div>

      <RecruitmentTabs />

      <form method="get" className="flex max-w-sm gap-2">
        <Input name="search" placeholder="Search by name or email…" defaultValue={search ?? ""} />
        <button type="submit" className="h-9 shrink-0 rounded-lg bg-primary px-3 text-sm font-medium text-primary-foreground hover:bg-primary/80">
          Search
        </button>
      </form>

      {!result.ok ? (
        <Card className="border-dashed border-destructive/40">
          <CardHeader>
            <CardTitle className="text-base">Can&apos;t reach the API</CardTitle>
            <CardDescription>{result.error}</CardDescription>
          </CardHeader>
        </Card>
      ) : candidates.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">No candidates found.</CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-muted/40 text-left text-xs text-muted-foreground uppercase">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Nationality</th>
                  <th className="px-4 py-3 font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {candidates.map((candidate) => (
                  <tr key={candidate.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 font-medium text-foreground">
                      {candidate.firstName} {candidate.lastName}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{candidate.email}</td>
                    <td className="px-4 py-3 text-muted-foreground">{candidate.phone}</td>
                    <td className="px-4 py-3 text-muted-foreground">{candidate.nationality}</td>
                    <td className="px-4 py-3 text-right">
                      <Link href={`/admin/recruitment/candidates/${candidate.id}`} className="text-xs font-medium text-primary hover:underline">
                        View
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
