"use client"

import { useRef, useState, useTransition } from "react"

import { Button } from "@/components/ui/button"
import { SUGGESTED_PROMPTS, type AiMessage, type ChatArtifact } from "@/lib/api/ai-assistant"

import { sendMessageAction } from "./actions"
import { ArtifactRenderer } from "./artifact-renderer"

interface DisplayMessage {
  id: string
  role: "USER" | "ASSISTANT"
  content: string
  artifacts: ChatArtifact[]
}

function toDisplay(messages: AiMessage[]): DisplayMessage[] {
  return messages.map((m) => ({ id: m.id, role: m.role, content: m.content, artifacts: m.artifacts ?? [] }))
}

export function ChatWindow({
  actingEmployeeId,
  isAdmin,
  llmConfigured,
  initialConversationId,
  initialMessages,
}: {
  actingEmployeeId: string
  isAdmin: boolean
  llmConfigured: boolean
  initialConversationId?: string
  initialMessages?: AiMessage[]
}) {
  const [conversationId, setConversationId] = useState(initialConversationId)
  const [messages, setMessages] = useState<DisplayMessage[]>(initialMessages ? toDisplay(initialMessages) : [])
  const [input, setInput] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  function scrollToBottom() {
    requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }))
  }

  function send(text: string) {
    const trimmed = text.trim()
    if (!trimmed || isPending) return
    setError(null)
    setInput("")

    const userMessage: DisplayMessage = { id: `local-${Date.now()}`, role: "USER", content: trimmed, artifacts: [] }
    setMessages((prev) => [...prev, userMessage])
    scrollToBottom()

    startTransition(async () => {
      const result = await sendMessageAction(actingEmployeeId, trimmed, conversationId)
      if (!result.ok) {
        setError(result.error)
        return
      }
      setConversationId(result.data.conversationId)
      setMessages((prev) => [...prev, { id: result.data.messageId, role: "ASSISTANT", content: result.data.message, artifacts: result.data.artifacts }])
      scrollToBottom()
    })
  }

  return (
    <div className="flex h-[calc(100vh-14rem)] min-h-[420px] flex-col rounded-xl border border-border bg-background">
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-4 text-center">
            <p className="text-sm text-muted-foreground">
              {llmConfigured
                ? "Ask about workforce, recruitment, leave, performance, learning, or employee relations data — in plain language."
                : "The assistant is installed but not yet configured — an administrator needs to set ANTHROPIC_API_KEY on the server."}
            </p>
            <div className="flex max-w-2xl flex-wrap justify-center gap-2">
              {SUGGESTED_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => send(prompt)}
                  className="rounded-full border border-border px-3 py-1.5 text-xs text-foreground hover:bg-muted"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {messages.map((m) => (
              <div key={m.id} className={`flex ${m.role === "USER" ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${m.role === "USER" ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
                  <p className="whitespace-pre-wrap">{m.content}</p>
                  {m.role === "ASSISTANT" && <ArtifactRenderer artifacts={m.artifacts} actingEmployeeId={actingEmployeeId} isAdmin={isAdmin} />}
                </div>
              </div>
            ))}
            {isPending && (
              <div className="flex justify-start">
                <div className="rounded-2xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">Thinking…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      {error && <p className="border-t border-destructive/30 bg-destructive/5 px-4 py-2 text-xs text-destructive">{error}</p>}

      <form
        onSubmit={(e) => {
          e.preventDefault()
          send(input)
        }}
        className="flex items-center gap-2 border-t border-border p-3"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask the AI HR Administration Assistant…"
          className="h-10 flex-1 rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"
          disabled={isPending}
        />
        <Button type="submit" disabled={isPending || !input.trim()}>
          Send
        </Button>
      </form>
    </div>
  )
}
