import { AlertTriangle, HelpCircle } from "lucide-react";

import { ChannelIcon } from "@/components/shared/channel-badge";
import { MethodBadge } from "@/components/shared/method-badge";
import type { ResolutionChainStep } from "@/lib/types/customer";
import { CHANNEL_LABEL } from "@/lib/types/domain";
import { formatDateTimeIST } from "@/lib/shared/format";

/**
 * The resolution chain (Screen Spec S-05): every decision the engine made for
 * this customer, in arrival order, with the evidence it used. This is the
 * answer to "why does JourneyX believe this event belongs to this customer?" —
 * read straight from `resolution_logs`, never reconstructed for display.
 */
export function ResolutionChain({ chain }: { chain: ResolutionChainStep[] }) {
  return (
    <section
      aria-labelledby="chain-heading"
      className="rounded-md border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="chain-heading" className="text-[15px] font-semibold text-foreground">
          Resolution chain
        </h2>
        <p className="text-[13px] text-text-secondary">
          {chain.length} {chain.length === 1 ? "decision" : "decisions"}
        </p>
      </div>
      <p className="mt-1 text-[13px] text-text-secondary">
        Only signals that actually contributed are listed.
      </p>

      <ol className="mt-4 flex flex-col">
        {chain.map((step, index) => (
          <li key={step.eventId} className="relative flex gap-3 pb-4 last:pb-0">
            {/* Thread connecting the steps */}
            {index < chain.length - 1 ? (
              <span
                aria-hidden
                className="absolute left-[11px] top-6 h-[calc(100%-1rem)] w-px bg-border"
              />
            ) : null}
            <span
              aria-hidden
              className="relative z-10 mt-1 flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border border-border bg-surface font-mono text-[10px] tabular-nums text-text-secondary"
            >
              {index + 1}
            </span>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-sm font-medium text-foreground">
                  <ChannelIcon channel={step.channel} className="h-3.5 w-3.5" />
                  {step.eventType.replace(/_/g, " ")}
                </span>
                <span className="text-[12px] text-text-secondary">
                  {CHANNEL_LABEL[step.channel]} · {formatDateTimeIST(step.timestampIso)}
                </span>
                <MethodBadge method={step.method} className="ml-auto" />
                {step.method === "origin" ? (
                  <span className="font-mono text-[12px] text-text-muted">no prior match</span>
                ) : (
                  <span className="font-mono text-[12px] tabular-nums text-text-secondary">
                    {step.confidence.toFixed(2)}
                  </span>
                )}
              </div>

              {step.evidence.length > 0 ? (
                <ul className="mt-1.5 flex flex-col gap-1 border-l-2 border-border pl-3">
                  {step.evidence.map((line, i) => (
                    <li key={i} className="text-[12px] text-text-secondary">
                      {line}
                    </li>
                  ))}
                </ul>
              ) : null}

              {step.identifiersAdded.length > 0 ? (
                <p className="mt-1.5 text-[12px] text-foreground">
                  Added{" "}
                  {step.identifiersAdded
                    .map((i) => `${i.type.replace(/_/g, " ")} ${i.maskedValue}`)
                    .join(", ")}
                </p>
              ) : null}

              {step.ambiguous ? (
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-xs bg-info-tint px-2 py-0.5 text-[12px] text-info">
                  <HelpCircle aria-hidden className="h-3 w-3" />
                  Ambiguous: candidates were too close to call, so a new profile was created.
                </p>
              ) : null}
              {step.conflict ? (
                <p className="mt-1.5 inline-flex items-center gap-1 rounded-xs bg-warning-tint px-2 py-0.5 text-[12px] text-warning">
                  <AlertTriangle aria-hidden className="h-3 w-3" />
                  Identity conflict: competing strong identifiers, no profiles merged.
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
