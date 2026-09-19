import type { Metadata } from "next";

import { PagePlaceholder } from "@/components/layout/page-placeholder";

export const metadata: Metadata = { title: "Customers" };

export default function CustomersPage() {
  return (
    <PagePlaceholder
      title="Customers"
      note="Browse, filter, and investigate unified customer profiles. Implemented in a later milestone."
    />
  );
}
