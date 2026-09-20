import Link from "next/link";
import { notFound } from "next/navigation";

import { getCustomerJourney } from "@/lib/queries/customers";
import type { Channel } from "@/lib/types/domain";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { TimelineFilterBar } from "@/components/journey/timeline-filter-bar";
import { JourneyThread } from "@/components/journey/journey-thread";

export default async function CustomerJourneyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const journey = await getCustomerJourney(id);
  if (!journey) notFound();

  const channelParam = typeof sp.channel === "string" ? sp.channel : undefined;
  const active = channelParam ? (channelParam.split(",") as Channel[]) : [];
  const visibleEvents =
    active.length > 0
      ? journey.events.filter((e) => active.includes(e.channel))
      : journey.events;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-[15px] font-semibold text-foreground">Journey</h2>
        <p className="mt-0.5 text-[13px] text-text-secondary">
          {journey.totalEvents} events · {journey.journeyCount}{" "}
          {journey.journeyCount === 1 ? "journey" : "journeys"} ·{" "}
          {journey.channels.length} channels · synthetic data
        </p>
      </div>

      {journey.totalEvents > 0 ? (
        <TimelineFilterBar
          channels={journey.channels}
          total={journey.totalEvents}
          visible={visibleEvents.length}
        />
      ) : null}

      {journey.totalEvents === 0 ? (
        <EmptyState
          title="No journey yet."
          description="This customer has no stitched events."
        />
      ) : visibleEvents.length === 0 ? (
        <EmptyState
          title="No events match these filters."
          description="Try removing a channel to see the full journey."
          action={
            <Button asChild variant="secondary">
              <Link href={`/customers/${id}/journey`}>Clear filters</Link>
            </Button>
          }
        />
      ) : (
        <JourneyThread
          events={visibleEvents}
          asOfIso={journey.asOfIso}
          silenceDays={journey.silenceDays}
        />
      )}
    </div>
  );
}
