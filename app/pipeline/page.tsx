import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Pipeline" };

export default function PipelinePage() {
  return (
    <PagePlaceholder
      title="Pipeline health"
      note="Ingestion stage counters, identity stats, and recent errors (P2). Implemented only if ahead of schedule."
    />
  );
}
