import { cn } from "@/lib/utils";

/**
 * JourneyX "Convergent Thread" symbol.
 *
 * The path geometry and colors are copied verbatim from the authoritative
 * asset `JourneyX_Brand_Assets/journeyx-symbol.svg` (the brand rule requires
 * using the defined geometry, never recreating it freehand). The app-icon
 * container tile is intentionally omitted so the mark sits cleanly in the rail.
 *
 * Neutral threads use `currentColor` (Slate in light, #D0D5DD in dark — exactly
 * as the light/dark logo variants specify); the resolving thread and the
 * convergence node keep Signal Teal (#10B7A5) constant across themes.
 */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 520 520"
      role="img"
      aria-label="JourneyX"
      className={cn("text-slate dark:text-[#d0d5dd]", className)}
    >
      <g transform="translate(42,89) scale(0.96)">
        <path
          d="M90 45 C145 45 170 78 222 110 C258 132 282 145 340 145"
          fill="none"
          stroke="currentColor"
          strokeWidth="34"
          strokeLinecap="round"
        />
        <path
          d="M90 145 C145 145 170 145 218 145 C265 145 292 120 340 78"
          fill="none"
          stroke="var(--jx-teal-500)"
          strokeWidth="34"
          strokeLinecap="round"
        />
        <path
          d="M90 245 C145 245 175 212 222 180 C260 155 286 145 340 145"
          fill="none"
          stroke="currentColor"
          strokeWidth="34"
          strokeLinecap="round"
        />
        <circle cx="340" cy="145" r="23" fill="var(--jx-teal-500)" />
      </g>
    </svg>
  );
}
