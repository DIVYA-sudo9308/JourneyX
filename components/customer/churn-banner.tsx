import { cn } from "@/lib/utils";
import type { ChurnRisk } from "@/lib/types/domain";
import type { ChurnSignal } from "@/lib/types/customer";
import { ChurnRiskPill } from "@/components/shared/churn-risk-pill";

/**
 * Profile-level churn banner (Screen Spec S-03, SoT D-31): risk pill plus the
 * matched rules as evidence. Risk reads without color alone (pill = icon +
 * text); the tint/left-accent only reinforces it.
 */
export function ChurnBanner({
  risk,
  signals,
}: {
  risk: ChurnRisk;
  signals: ChurnSignal[];
}) {
  const accent =
    risk === "high"
      ? "border-l-danger bg-danger-tint"
      : risk === "medium"
        ? "border-l-warning bg-warning-tint"
        : "border-l-border bg-surface";

  return (
    <section
      aria-labelledby="churn-heading"
      className={cn(
        "rounded-md border border-border border-l-[3px] p-4",
        accent,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2
          id="churn-heading"
          className="text-[15px] font-semibold text-foreground"
        >
          Churn risk
        </h2>
        <ChurnRiskPill risk={risk} />
      </div>

      {signals.length > 0 ? (
        <ul className="mt-3 flex flex-col gap-1.5">
          {signals.map((signal, index) => (
            <li
              key={index}
              className="flex gap-2 text-[13px] text-foreground"
            >
              <span aria-hidden className="text-text-muted">
                •
              </span>
              {signal.evidence}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-2 text-[13px] text-text-secondary">
          No churn signal detected.
        </p>
      )}
    </section>
  );
}
