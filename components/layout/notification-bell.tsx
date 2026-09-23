"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Bell, GitMerge, Loader2 } from "lucide-react";
import useSWR from "swr";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { fetcher } from "@/lib/api/fetcher";
import type { NotificationFeed } from "@/lib/queries/notifications";
import { cn } from "@/lib/utils";

/** SWR poll interval (SoT §4.10), paused while the tab is hidden. */
const REFRESH_MS = 30_000;

/**
 * Notification bell (Design System §12/§27). Reads `/api/v1/notifications`,
 * which returns rows the pipeline created — identity conflicts raised by the
 * resolver and high churn risk raised by pattern reconciliation.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const { data, isLoading, mutate } = useSWR<NotificationFeed>(
    "/notifications",
    fetcher,
    {
      refreshInterval: REFRESH_MS,
      refreshWhenHidden: false,
      revalidateOnFocus: true,
      // An unconfigured database must not spam the console on every poll.
      onError: () => {},
    },
  );

  const unread = data?.unread ?? 0;
  const items = data?.items ?? [];

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!panelRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  async function markAllRead() {
    // Optimistic: the panel is open, so the badge should clear immediately.
    await mutate(
      async () => {
        await fetch("/api/v1/notifications/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{}",
        });
        return undefined;
      },
      {
        optimisticData: data
          ? { ...data, unread: 0, items: items.map((i) => ({ ...i, read: true })) }
          : undefined,
        revalidate: true,
      },
    );
  }

  return (
    <div className="relative" ref={panelRef}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
            aria-expanded={open}
            aria-haspopup="dialog"
            onClick={() => setOpen((v) => !v)}
          >
            <span className="relative inline-flex">
              <Bell />
              {unread > 0 ? (
                <span
                  aria-hidden
                  className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-pill bg-danger px-1 font-mono text-[10px] font-semibold tabular-nums text-white"
                >
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom">Notifications</TooltipContent>
      </Tooltip>

      {open ? (
        <div
          role="dialog"
          aria-label="Notifications"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[min(380px,calc(100vw-2rem))] overflow-hidden rounded-md border border-border bg-surface shadow-lg"
        >
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-2.5">
            <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
            {unread > 0 ? (
              <button
                type="button"
                onClick={markAllRead}
                className="rounded-sm text-[12px] text-accent underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {isLoading && items.length === 0 ? (
              <p className="flex items-center gap-2 px-4 py-6 text-[13px] text-text-secondary">
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
                Loading…
              </p>
            ) : items.length === 0 ? (
              <p className="px-4 py-6 text-[13px] text-text-secondary">
                No alerts. Identity conflicts and high churn risk appear here as
                the pipeline detects them.
              </p>
            ) : (
              <ul className="flex flex-col divide-y divide-border">
                {items.map((item) => {
                  const Icon = item.type === "identity_conflict" ? GitMerge : AlertTriangle;
                  const body = (
                    <span className="flex items-start gap-2">
                      <Icon
                        aria-hidden
                        className={cn(
                          "mt-0.5 h-4 w-4 shrink-0",
                          item.severity === "critical" ? "text-danger" : "text-warning",
                        )}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block text-[13px] font-medium text-foreground">
                          {item.title}
                        </span>
                        <span className="mt-0.5 block text-[12px] text-text-secondary">
                          {item.message}
                        </span>
                      </span>
                      {!item.read ? (
                        <span
                          aria-label="Unread"
                          className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-pill bg-accent"
                        />
                      ) : null}
                    </span>
                  );
                  return (
                    <li key={item.id}>
                      {item.deepLink ? (
                        <Link
                          href={item.deepLink}
                          onClick={() => setOpen(false)}
                          className="block px-4 py-3 transition-colors hover:bg-surface-alt focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        >
                          {body}
                        </Link>
                      ) : (
                        <div className="px-4 py-3">{body}</div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
