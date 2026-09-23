import { ConfidenceMeter } from "@/components/shared/confidence-meter";
import { MethodBadge } from "@/components/shared/method-badge";
import { ChannelIcon } from "@/components/shared/channel-badge";
import type { IdentityNode } from "@/lib/types/customer";
import { CHANNEL_LABEL } from "@/lib/types/domain";
import { formatDateIST } from "@/lib/shared/format";

const IDENTIFIER_LABEL: Record<string, string> = {
  email: "Email",
  phone: "Phone",
  loyalty_id: "Loyalty ID",
  device_id: "Device ID",
  cookie_id: "Cookie ID",
  name: "Name",
};

/** Edge color follows the method badge, so the two always agree. */
const EDGE_CLASS: Record<string, string> = {
  origin: "stroke-text-muted",
  deterministic: "stroke-accent",
  probabilistic: "stroke-info",
  conflict: "stroke-warning",
};

/**
 * The convergence graph (Screen Spec S-05): every identifier the engine linked
 * to this customer, drawn as an edge whose style is the resolution method and
 * whose label is the link confidence. Rendered as inline SVG against the
 * existing design tokens — a graph library would add weight without adding
 * explanation.
 *
 * The SVG is decorative; the list beneath it carries the same information for
 * screen readers and at narrow widths.
 */
export function ConvergenceGraph({
  nodes,
  displayName,
  identityConfidence,
}: {
  nodes: IdentityNode[];
  displayName: string | null;
  identityConfidence: number;
}) {
  const rowHeight = 56;
  const height = Math.max(nodes.length * rowHeight + 24, 160);
  const centerY = height / 2;
  const hubX = 118;
  const nodeX = 300;

  return (
    <section
      aria-labelledby="graph-heading"
      className="rounded-md border border-border bg-surface p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="graph-heading" className="text-[15px] font-semibold text-foreground">
          Unified customer
        </h2>
        <ConfidenceMeter confidence={identityConfidence} showLabel />
      </div>
      <p className="mt-1 text-[13px] text-text-secondary">
        Each edge is a resolution decision, labelled with the confidence it was
        made at. The profile&rsquo;s confidence is its weakest link.
      </p>

      {/* Graph: hidden from assistive tech; the list below is the accessible copy. */}
      <div className="mt-4 hidden overflow-x-auto md:block">
        <svg
          role="presentation"
          viewBox={`0 0 560 ${height}`}
          className="h-auto w-full max-w-[560px]"
        >
          {nodes.map((node, index) => {
            const y = 24 + index * rowHeight + rowHeight / 2;
            const edge = EDGE_CLASS[node.linkMethod] ?? "stroke-border";
            return (
              <g key={node.id}>
                <path
                  d={`M ${hubX} ${centerY} C ${(hubX + nodeX) / 2} ${centerY}, ${(hubX + nodeX) / 2} ${y}, ${nodeX} ${y}`}
                  fill="none"
                  strokeWidth={1.5}
                  strokeDasharray={node.linkMethod === "probabilistic" ? "4 3" : undefined}
                  className={edge}
                />
                <text
                  x={(hubX + nodeX) / 2}
                  y={(centerY + y) / 2 - 4}
                  textAnchor="middle"
                  className="fill-text-muted font-mono text-[10px]"
                >
                  {node.linkConfidence.toFixed(2)}
                </text>
                <circle cx={nodeX} cy={y} r={4} className="fill-accent" />
                <text
                  x={nodeX + 12}
                  y={y - 3}
                  className="fill-text-secondary text-[11px] uppercase"
                >
                  {IDENTIFIER_LABEL[node.type] ?? node.type}
                </text>
                <text x={nodeX + 12} y={y + 11} className="fill-foreground font-mono text-[11px]">
                  {truncate(node.value, 30)}
                </text>
              </g>
            );
          })}
          <circle cx={hubX} cy={centerY} r={34} className="fill-accent-tint stroke-accent" strokeWidth={1.5} />
          <text
            x={hubX}
            y={centerY + 4}
            textAnchor="middle"
            className="fill-foreground text-[11px] font-semibold"
          >
            {initials(displayName)}
          </text>
        </svg>
      </div>

      {/* The same relationships, as data. */}
      <ul className="mt-4 flex flex-col divide-y divide-border border-t border-border">
        {nodes.map((node) => (
          <li key={`row-${node.id}`} className="py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex min-w-0 items-baseline gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.03em] text-text-secondary">
                  {IDENTIFIER_LABEL[node.type] ?? node.type}
                </span>
                <span className="break-all font-mono text-[13px] text-foreground">
                  {node.value}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <MethodBadge method={node.linkMethod} />
                <span className="font-mono text-[12px] tabular-nums text-text-secondary">
                  {node.linkConfidence.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-secondary">
              <span className="inline-flex items-center gap-1">
                <ChannelIcon channel={node.sourceChannel} className="h-3.5 w-3.5" />
                {CHANNEL_LABEL[node.sourceChannel]}
              </span>
              <span>First seen {formatDateIST(node.firstSeenIso)}</span>
              <span>Last seen {formatDateIST(node.lastSeenIso)}</span>
              {node.linkedByEventType ? (
                <span className="font-mono text-[11px] text-text-muted">
                  via {node.linkedByEventType.replace(/_/g, " ")}
                </span>
              ) : null}
            </div>

            {node.evidence.length > 0 ? (
              <ul className="mt-2 flex flex-col gap-1 border-l-2 border-border pl-3">
                {node.evidence.map((line, i) => (
                  <li key={i} className="text-[12px] text-text-secondary">
                    {line}
                  </li>
                ))}
              </ul>
            ) : null}
          </li>
        ))}
      </ul>
    </section>
  );
}

function initials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? "").join("") || "?";
}

function truncate(value: string, max: number): string {
  return value.length <= max ? value : `${value.slice(0, max - 1)}…`;
}
