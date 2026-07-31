import Link from "next/link"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { fetchAssistantStatus, fetchConversation, fetchConversations } from "@/lib/api/ai-assistant"
import { getSession } from "@/lib/get-session"

import { ChatWindow } from "./chat-window"

export default async function AiAssistantPage({ searchParams }: { searchParams: Promise<{ c?: string }> }) {
  const { c: conversationId } = await searchParams
  const session = await getSession()
  const actingEmployeeId = session?.employeeId ?? ""
  const isAdmin = session?.role === "admin"

  const [statusResult, conversationsResult, activeConversationResult] = await Promise.all([
    fetchAssistantStatus(),
    fetchConversations(actingEmployeeId),
    conversationId ? fetchConversation(conversationId, actingEmployeeId) : Promise.resolve(null),
  ])

  const llmConfigured = statusResult.ok ? statusResult.data.configured : false
  const conversations = conversationsResult.ok ? conversationsResult.data : []
  const activeConversation = activeConversationResult && activeConversationResult.ok ? activeConversationResult.data : null

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">AI HR Administration Assistant</h1>
          <p className="text-sm text-muted-foreground">
            Ask about workforce, recruitment, leave, performance, learning, or employee relations data — in plain language.
            {isAdmin && " HR administrators can also propose administrative actions here, which require your confirmation before anything changes."}
          </p>
        </div>
        {isAdmin && (
          <Link href="/admin/ai-assistant/audit-log" className="h-9 rounded-lg border border-border px-3 text-sm font-medium text-foreground leading-9 hover:bg-muted">
            View audit log
          </Link>
        )}
      </div>

      {!llmConfigured && (
        <Card className="border-dashed border-amber-400/60 bg-amber-50 dark:bg-amber-950/20">
          <CardHeader>
            <CardTitle className="text-base">Assistant not yet configured</CardTitle>
            <CardDescription>
              An administrator needs to set the <code>ANTHROPIC_API_KEY</code> environment variable on the server. Once set, this page will answer questions using
              live HR data immediately — no other setup needed.
            </CardDescription>
          </CardHeader>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[240px_1fr]">
        <Card className="hidden lg:block">
          <CardHeader>
            <CardTitle className="text-sm">Recent conversations</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 p-3 pt-0">
            <Link href="/admin/ai-assistant" className="rounded-lg px-2 py-1.5 text-xs font-medium text-primary hover:bg-muted">
              + New conversation
            </Link>
            {conversations.length === 0 ? (
              <p className="px-2 py-1.5 text-xs text-muted-foreground">No conversations yet.</p>
            ) : (
              conversations.map((c) => (
                <Link
                  key={c.id}
                  href={`/admin/ai-assistant?c=${c.id}`}
                  className={`truncate rounded-lg px-2 py-1.5 text-xs hover:bg-muted ${c.id === conversationId ? "bg-muted font-medium text-foreground" : "text-muted-foreground"}`}
                >
                  {c.title ?? "Untitled conversation"}
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <ChatWindow
          actingEmployeeId={actingEmployeeId}
          isAdmin={isAdmin}
          llmConfigured={llmConfigured}
          initialConversationId={activeConversation?.id}
          initialMessages={activeConversation?.messages}
        />
      </div>
    </div>
  )
}
