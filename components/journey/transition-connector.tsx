import { ArrowRight } from "lucide-react";

import { CHANNEL_LABEL, type Channel } from "@/lib/types/domain";
import { ChannelIcon } from "@/components/shared/channel-badge";

/** Cross-channel transition marker (DS §35): the visible "stitch". */
export function TransitionConnector({
  from,
  to,
}: {
  from: Channel;
  to: Channel;
}) {
  return (
    <p className="mb-1.5 inline-flex items-center gap-1.5 text-[11px] text-text-secondary">
      <span className="inline-flex items-center gap-1">
        <ChannelIcon channel={from} />
        {CHANNEL_LABEL[from]}
      </span>
      <ArrowRight aria-hidden className="h-3 w-3 text-text-muted" />
      <span className="inline-flex items-center gap-1">
        <ChannelIcon channel={to} />
        {CHANNEL_LABEL[to]}
      </span>
    </p>
  );
}
