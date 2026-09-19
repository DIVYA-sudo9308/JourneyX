import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Dashboard" };

export default function DashboardPage() {
  return (
    <PagePlaceholder
      title="Dashboard"
      note="Analytics overview — KPIs, friction ranking, escalation pairs, and churn correlation. Implemented in a later milestone."
    />
  );
}
