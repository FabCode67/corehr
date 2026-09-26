/**
 * Pure, dependency-free constants pulled out of lib/api/ai-assistant.ts.
 *
 * ai-assistant.ts imports apiFetch/apiFetchSafe from ./client, which
 * imports next/headers's cookies() — fine for its Server Component/Action
 * fetchers, but poison for any "use client" component that also wants a
 * plain constant like the one below, since Turbopack's Server/Client
 * boundary check is per-file, not per-export (see export-urls.ts and
 * siblings for the same pattern elsewhere in lib/api).
 */

export const SUGGESTED_PROMPTS = [
  "What's our current headcount and how has it changed this year?",
  "Show me the attrition rate by department.",
  "What's our mandatory training compliance rate?",
  "Summarize open recruitment requisitions.",
  "What's the leave utilization for this year?",
  "Generate an Excel workforce report.",
]
