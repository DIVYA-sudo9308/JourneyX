import {
  Monitor,
  Smartphone,
  Headset,
  Mail,
  MessageSquare,
  Store,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import { CHANNEL_LABEL, type Channel } from "@/lib/types/domain";

/**
 * Channel (icon + accent color) pairing, fixed across every view (DS §36).
 * Color reinforces the icon; it never stands alone (P4) — callers render the
 * label too whenever space allows, or provide one via `aria-label`.
 */
const CHANNEL_ICON: Record<Channel, LucideIcon> = {
  web: Monitor,
  mobile: Smartphone,
  call_center: Headset,
  email: Mail,
  chat: MessageSquare,
  in_store: Store,
};

const CHANNEL_CLASS: Record<Channel, string> = {
  web: "text-channel-web",
  mobile: "text-channel-mobile",
  call_center: "text-channel-call-center",
  email: "text-channel-email",
  chat: "text-channel-chat",
  in_store: "text-channel-in-store",
};

export function ChannelIcon({
  channel,
  className,
}: {
  channel: Channel;
  className?: string;
}) {
  const Icon = CHANNEL_ICON[channel];
  return (
    <Icon
      aria-hidden
      strokeWidth={1.75}
      className={cn("h-4 w-4", CHANNEL_CLASS[channel], className)}
    />
  );
}

/** Icon + label pairing used in legends, filters, and table cells. */
export function ChannelBadge({
  channel,
  className,
}: {
  channel: Channel;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-sm text-foreground",
        className,
      )}
    >
      <ChannelIcon channel={channel} />
      {CHANNEL_LABEL[channel]}
    </span>
  );
}
