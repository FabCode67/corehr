"use client"

import { useEffect, useState, useTransition } from "react"
import Link from "next/link"
import { Bell, GraduationCap } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  getMyNotifications,
  getOverdueTrainingAlerts,
  markAllNotificationsRead,
  markNotificationRead,
  type AppNotification,
  type OverdueTrainingAlert,
} from "@/lib/api/notifications-actions"

const POLL_INTERVAL_MS = 60_000

function relativeTime(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000)
  if (minutes < 1) return "just now"
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

/**
 * Header bell — combines two sources: real, stored Notification rows
 * (leave, ERC, forms, recruitment, onboarding docs, exits, imports,
 * professional profile — see notifications-actions.ts's doc comment) and
 * live-computed overdue-mandatory-training alerts (same data as
 * MandatoryTrainingBanner, which has no stored rows to read). Polls every
 * 60s and also re-fetches on open, so the badge count doesn't require a
 * page refresh to update.
 */
export function NotificationBell({ employeeId }: { employeeId: string }) {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<AppNotification[]>([])
  const [training, setTraining] = useState<{ mine: OverdueTrainingAlert[]; team: OverdueTrainingAlert[] }>({
    mine: [],
    team: [],
  })
  const [loading, setLoading] = useState(true)
  const [isPending, startTransition] = useTransition()

  async function refresh() {
    const [n, t] = await Promise.all([getMyNotifications(employeeId), getOverdueTrainingAlerts(employeeId)])
    setNotifications(n)
    setTraining(t)
    setLoading(false)
  }

  useEffect(() => {
    if (!employeeId) return
    refresh()
    const interval = setInterval(refresh, POLL_INTERVAL_MS)
    return () => clearInterval(interval)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId])

  const unreadNotifications = notifications.filter((n) => !n.isRead)
  const trainingCount = training.mine.length + training.team.length
  const unreadCount = unreadNotifications.length + trainingCount

  function handleOpenChange(next: boolean) {
    setOpen(next)
    if (next) refresh()
  }

  function handleMarkRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)))
    startTransition(async () => {
      await markNotificationRead(id)
    })
  }

  function handleMarkAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })))
    startTransition(async () => {
      await markAllNotificationsRead(employeeId)
    })
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        aria-label="Notifications"
        className="relative flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <Bell className="size-5" />
        {unreadCount > 0 ? (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        ) : null}
      </PopoverTrigger>

      <PopoverContent>
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          {unreadNotifications.length > 0 ? (
            <button
              type="button"
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="text-xs font-medium text-primary hover:underline disabled:opacity-50"
            >
              Mark all as read
            </button>
          ) : null}
        </div>

        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading…</p>
          ) : unreadCount === 0 && notifications.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-muted-foreground">You&apos;re all caught up.</p>
          ) : (
            <>
              {trainingCount > 0 ? (
                <div className="border-b border-border">
                  <p className="px-4 pt-3 pb-1 text-xs font-semibold text-muted-foreground uppercase">
                    Overdue mandatory training
                  </p>
                  {training.mine.map((a) => (
                    <Link
                      key={`mine-${a.id}`}
                      href="/staff/learning"
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/50"
                    >
                      <GraduationCap className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <span className="text-sm text-foreground">
                        You&apos;re overdue for <span className="font-medium">{a.courseName}</span>
                        {a.dueDate ? (
                          <span className="block text-xs text-muted-foreground">
                            Due {new Date(a.dueDate).toLocaleDateString()}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  ))}
                  {training.team.map((a) => (
                    <Link
                      key={`team-${a.id}`}
                      href="/staff/learning"
                      onClick={() => setOpen(false)}
                      className="flex items-start gap-2.5 px-4 py-2.5 hover:bg-muted/50"
                    >
                      <GraduationCap className="mt-0.5 size-4 shrink-0 text-destructive" />
                      <span className="text-sm text-foreground">
                        <span className="font-medium">
                          {a.employee?.firstName} {a.employee?.lastName}
                        </span>{" "}
                        is overdue for {a.courseName}
                        {a.dueDate ? (
                          <span className="block text-xs text-muted-foreground">
                            Due {new Date(a.dueDate).toLocaleDateString()}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  ))}
                </div>
              ) : null}

              {notifications.length === 0 ? (
                trainingCount === 0 ? null : (
                  <p className="px-4 py-6 text-center text-xs text-muted-foreground">No other notifications.</p>
                )
              ) : (
                notifications.slice(0, 20).map((n) => (
                  <button
                    key={n.id}
                    type="button"
                    onClick={() => handleMarkRead(n.id)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 border-b border-border px-4 py-2.5 text-left last:border-b-0 hover:bg-muted/50",
                      !n.isRead && "bg-primary/5"
                    )}
                  >
                    <span className="flex items-center gap-2">
                      {!n.isRead ? <span className="size-1.5 shrink-0 rounded-full bg-primary" /> : null}
                      <span className="text-sm font-medium text-foreground">{n.title}</span>
                    </span>
                    <span className="text-xs text-muted-foreground">{n.message}</span>
                    <span className="text-[11px] text-muted-foreground">{relativeTime(n.createdAt)}</span>
                  </button>
                ))
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
