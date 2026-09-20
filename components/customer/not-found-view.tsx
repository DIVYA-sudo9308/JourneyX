import Link from "next/link";

import { Button } from "@/components/ui/button";

/** Shown for an unknown customer id (Screen Spec S-03 404 state). */
export function NotFoundView() {
  return (
    <div className="mx-auto flex max-w-[1440px] flex-col items-center gap-3 px-4 py-16 text-center sm:px-6">
      <h1 className="text-lg font-semibold text-foreground">
        Customer not found
      </h1>
      <p className="max-w-md text-sm text-text-secondary">
        This customer profile doesn&apos;t exist or is no longer available.
      </p>
      <Button asChild variant="secondary">
        <Link href="/customers">Back to Customers</Link>
      </Button>
    </div>
  );
}
