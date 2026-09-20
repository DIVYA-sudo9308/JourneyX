import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";
import type { JourneyEvent } from "@/lib/types/customer";
import { formatDateTimeIST, formatRelativeTime } from "@/lib/shared/format";
import { PatternBadge } from "@/components/shared/pattern-badge";
import { MethodBadge } from "@/components/shared/method-badge";
import { ConfidenceMeter } from "@/components/shared/confidence-meter";
import { eventTypeMeta } from "./event-meta";

/**
 * A journey event card (S-04 collapsed / S-06 expanded). Collapsed shows the
 * type, time and a one-line summary; expanded reveals metadata, the
 * resolution block, pattern detail, and the raw record.
 */
export function EventCard({
  event,
  asOf,
  expanded,
  highlighted,
  onToggle,
  onPatternClick,
}: {
  event: JourneyEvent;
  asOf: Date;
  expanded: boolean;
  highlighted: boolean;
  onToggle: () => void;
  onPatternClick: (groupId: string) => void;
}) {
  const { label } = eventTypeMeta(event.eventType);
  const raw = JSON.stringify(
    {
      id: event.id,
      channel: event.channel,
      event_type: event.eventType,
      event_category: event.eventCategory,
      timestamp: event.timestampIso,
      metadata: Object.fromEntries(event.metadata.map((m) => [m.label, m.value])),
      resolution: {
        method: event.resolution.method,
        confidence: event.resolution.confidence,
      },
    },
    null,
    2,
  );

  return (
    <div
      id={event.id}
      className={cn(
        "scroll-mt-20 rounded-md border bg-surface transition-colors",
        highlighted ? "border-accent ring-1 ring-accent" : "border-border",
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={expanded}
        className="flex w-full items-start gap-3 rounded-md p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline gap-x-2">
            <span className="text-sm font-semibold text-foreground">{label}</span>
            <time
              dateTime={event.timestampIso}
              title={formatDateTimeIST(event.timestampIso)}
              className="text-xs text-text-secondary"
            >
              {formatRelativeTime(event.timestampIso, asOf)}
            </time>
          </div>
          <p className="mt-0.5 text-[13px] text-text-secondary">
            {event.summary}
          </p>
        </div>
        <ChevronDown
          aria-hidden
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-text-muted transition-transform",
            expanded && "rotate-180",
          )}
        />
      </button>

      {event.patterns.length > 0 ? (
        <div className="flex flex-wrap items-center gap-2 px-3 pb-3">
          {event.patterns.map((pattern) => (
            <button
              key={`${pattern.groupId}-${pattern.role}`}
              type="button"
              onClick={() => onPatternClick(pattern.groupId)}
              className="inline-flex items-center gap-1.5 rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              title="Highlight related events"
            >
              <PatternBadge pattern={pattern.type} />
              <span className="text-[11px] text-text-secondary">
                {pattern.label}
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {expanded ? (
        <div className="flex flex-col gap-4 border-t border-border p-3">
          {event.metadata.length > 0 ? (
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:grid-cols-3">
              {event.metadata.map((m) => (
                <div key={m.label}>
                  <dt className="text-xs font-semibold uppercase tracking-[0.03em] text-text-secondary">
                    {m.label.replace(/_/g, " ")}
                  </dt>
                  <dd className="mt-0.5 font-mono text-[13px] text-foreground">
                    {m.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.03em] text-text-secondary">
              Identity resolution
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <MethodBadge method={event.resolution.method} />
              <ConfidenceMeter confidence={event.resolution.confidence} showLabel />
            </div>
            <ul className="mt-2 flex flex-col gap-1">
              {event.resolution.evidence.map((line, i) => (
                <li key={i} className="flex gap-2 text-[13px] text-text-secondary">
                  <span aria-hidden className="text-text-muted">
                    •
                  </span>
                  {line}
                </li>
              ))}
            </ul>
          </div>

          {event.patterns.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.03em] text-text-secondary">
                Detected patterns
              </p>
              <ul className="flex flex-col gap-1.5">
                {event.patterns.map((pattern) => (
                  <li
                    key={`${pattern.groupId}-${pattern.role}-detail`}
                    className="flex items-start gap-2"
                  >
                    <PatternBadge pattern={pattern.type} />
                    <span className="text-[13px] text-foreground">
                      {pattern.detail}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <details className="text-[13px]">
            <summary className="cursor-pointer text-text-secondary hover:text-foreground">
              Raw record
            </summary>
            <pre className="mt-2 overflow-x-auto rounded-sm bg-surface-alt p-3 font-mono text-xs text-foreground">
              {raw}
            </pre>
          </details>
        </div>
      ) : null}
    </div>
  );
}
