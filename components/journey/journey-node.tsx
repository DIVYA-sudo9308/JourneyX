import { cn } from "@/lib/utils";
import type { JourneyEvent } from "@/lib/types/customer";
import type { Channel } from "@/lib/types/domain";
import { eventTypeMeta } from "./event-meta";

/** Channel-colored ring for the node marker (DS §35 channel accent ring). */
const RING: Record<Channel, string> = {
  web: "border-channel-web",
  mobile: "border-channel-mobile",
  call_center: "border-channel-call-center",
  email: "border-channel-email",
  chat: "border-channel-chat",
  in_store: "border-channel-in-store",
};

/** A node on the Convergent Thread: channel-ring circle + event-type icon. */
export function JourneyNode({
  event,
  emphasized,
}: {
  event: JourneyEvent;
  emphasized?: boolean;
}) {
  const { icon: Icon } = eventTypeMeta(event.eventType);
  return (
    <span
      aria-hidden
      className={cn(
        "z-10 flex items-center justify-center rounded-pill border-2 bg-surface",
        RING[event.channel],
        emphasized ? "h-9 w-9" : "h-8 w-8",
      )}
    >
      <Icon
        className={cn("text-foreground", emphasized ? "h-4 w-4" : "h-3.5 w-3.5")}
        strokeWidth={1.75}
      />
    </span>
  );
}
