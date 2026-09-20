import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight } from "lucide-react";

import { getCustomer } from "@/lib/queries/customers";
import { PATTERN_LABEL } from "@/lib/types/domain";
import type { CustomerPattern } from "@/lib/types/customer";
import { Button } from "@/components/ui/button";
import { KpiCard } from "@/components/dashboard/kpi-card";
import { JourneyStats } from "@/components/customer/journey-stats";

const PATTERN_ORDER: CustomerPattern[] = [
  "drop_off",
  "escalation",
  "repeat_contact",
  "unresolved_issue",
];

export default async function CustomerOverviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) notFound();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap gap-2">
        <Button asChild variant="accent">
          <Link href={`/customers/${id}/journey`}>
            View journey
            <ArrowRight aria-hidden />
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/customers/${id}/identity`}>View identity</Link>
        </Button>
      </div>

      <JourneyStats customer={customer} />

      <section aria-labelledby="patterns-heading">
        <h2
          id="patterns-heading"
          className="mb-3 text-[15px] font-semibold text-foreground"
        >
          Detected patterns
        </h2>
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PATTERN_ORDER.map((pattern) => {
            const count = customer.patternCounts[pattern];
            return (
              <KpiCard
                key={pattern}
                kpi={{
                  key: pattern,
                  label: PATTERN_LABEL[pattern],
                  value: String(count),
                  href:
                    count > 0
                      ? `/customers/${id}/journey?pattern=${pattern}`
                      : undefined,
                }}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
}
