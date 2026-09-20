import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ChevronDown } from "lucide-react";

import { getCustomer } from "@/lib/queries/customers";
import { PageHeader } from "@/components/shared/page-header";
import { CustomerSummary } from "@/components/customer/customer-summary";
import { NotFoundView } from "@/components/customer/not-found-view";
import { TabNav } from "@/components/customer/tab-nav";

function nameFor(displayName: string | null, isAnonymous: boolean): string {
  return displayName ?? (isAnonymous ? "Anonymous customer" : "Customer");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const customer = await getCustomer(id);
  if (!customer) return { title: "Customer not found" };
  return { title: nameFor(customer.displayName, customer.isAnonymous) };
}

export default async function CustomerLayout({
  children,
  params,
}: LayoutProps<"/customers/[id]">) {
  const { id } = await params;
  const customer = await getCustomer(id);
  // A layout's notFound() bubbles past its own not-found.tsx in Next, so render
  // the not-found view directly here — this covers every tab uniformly.
  if (!customer) return <NotFoundView />;

  const name = nameFor(customer.displayName, customer.isAnonymous);

  return (
    <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6">
      <Link
        href="/customers"
        className="mb-4 inline-flex items-center gap-1 rounded-sm text-[13px] text-text-secondary transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft aria-hidden className="h-3.5 w-3.5" />
        Customers
      </Link>

      <PageHeader
        title={name}
        subtitle={`${customer.id} · ${customer.channels.length} channels · synthetic data`}
      />

      <div className="mt-6 lg:grid lg:grid-cols-[340px_1fr] lg:gap-8">
        {/* Persistent summary column (≥lg) */}
        <aside className="hidden lg:block" aria-label="Customer summary">
          <div className="sticky top-[72px]">
            <CustomerSummary customer={customer} />
          </div>
        </aside>

        {/* Collapsible summary (below lg) */}
        <details className="group mb-4 rounded-md border border-border bg-surface lg:hidden">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-4 py-3 text-sm font-medium text-foreground [&::-webkit-details-marker]:hidden">
            <span>Customer summary</span>
            <ChevronDown
              aria-hidden
              className="h-4 w-4 text-text-secondary transition-transform [[open]_&]:rotate-180"
            />
          </summary>
          <div className="border-t border-border p-4">
            <CustomerSummary customer={customer} />
          </div>
        </details>

        {/* Tabs + tab content */}
        <div className="min-w-0">
          <TabNav id={id} />
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
