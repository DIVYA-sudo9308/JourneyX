"use client";

import { useState } from "react";

import type { JourneyEvent } from "@/lib/types/customer";
import { JourneyNode } from "./journey-node";
import { EventCard } from "./event-card";
import { TransitionConnector } from "./transition-connector";
import { SessionBoundary } from "./session-boundary";
import { JourneyBoundary } from "./journey-boundary";
import { SilenceMarker } from "./silence-marker";

/**
 * The Convergent Thread (DS §35). Renders the (already channel-filtered) event
 * stream as a vertical thread with nodes, cross-channel transitions, session /
 * journey boundaries, and the trailing silence marker. Expand and
 * pattern-highlight are local, ephemeral state (scroll position is preserved).
 */
export function JourneyThread({
  events,
  asOfIso,
  silenceDays,
}: {
  events: JourneyEvent[];
  asOfIso: string;
  silenceDays: number;
}) {
  const asOf = new Date(asOfIso);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [highlightGroup, setHighlightGroup] = useState<string | null>(null);

  const onPatternClick = (groupId: string) => {
    setHighlightGroup(groupId);
    const anchor = events.find((e) =>
      e.patterns.some((p) => p.groupId === groupId && p.role === "anchor"),
    );
    const target = anchor ?? events.find((e) => e.patterns.some((p) => p.groupId === groupId));
    if (target && typeof document !== "undefined") {
      document
        .getElementById(target.id)
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  return (
    <ol className="flex flex-col">
      {events.map((event, i) => {
        const prev = i > 0 ? events[i - 1] : null;
        const visibleGapMinutes = prev
          ? (Date.parse(event.timestampIso) - Date.parse(prev.timestampIso)) / 60_000
          : 0;
        const journeyBoundary = prev !== null && event.journeyIndex !== prev.journeyIndex;
        const sessionBoundary =
          prev !== null &&
          !journeyBoundary &&
          event.sessionIndex !== prev.sessionIndex &&
          event.channel === prev.channel;
        const transition =
          prev !== null && !journeyBoundary && event.channel !== prev.channel;
        const emphasized = event.patterns.some((p) => p.role === "anchor");
        const highlighted =
          highlightGroup !== null &&
          event.patterns.some((p) => p.groupId === highlightGroup);

        return (
          <li key={event.id}>
            {journeyBoundary ? (
              <JourneyBoundary gapMinutes={visibleGapMinutes} />
            ) : null}
            <div className="flex gap-3">
              <div className="flex flex-col items-center">
                <JourneyNode event={event} emphasized={emphasized} />
                <span aria-hidden className="w-px grow bg-border" />
              </div>
              <div className="min-w-0 flex-1 pb-4">
                {transition ? (
                  <TransitionConnector from={prev.channel} to={event.channel} />
                ) : null}
                {sessionBoundary ? (
                  <SessionBoundary gapMinutes={visibleGapMinutes} />
                ) : null}
                <EventCard
                  event={event}
                  asOf={asOf}
                  expanded={expandedId === event.id}
                  highlighted={highlighted}
                  onToggle={() =>
                    setExpandedId((id) => (id === event.id ? null : event.id))
                  }
                  onPatternClick={onPatternClick}
                />
              </div>
            </div>
          </li>
        );
      })}
      <SilenceMarker days={silenceDays} />
    </ol>
  );
}
