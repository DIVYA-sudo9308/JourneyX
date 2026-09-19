"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { CustomerFilters } from "./customer-filters";

const MULTI_PARAMS = ["pattern", "channel", "churnRisk"];
const SINGLE_PARAMS = ["minConfidence", "dateFrom", "dateTo"];

/**
 * Filter rail (DS §43): an inline sidebar on ≥lg, a button-triggered sheet
 * below lg. Both render the same URL-driven `CustomerFilters`.
 */
export function FilterRail() {
  const searchParams = useSearchParams();
  const [open, setOpen] = useState(false);

  const activeCount =
    MULTI_PARAMS.reduce((n, p) => {
      const v = searchParams.get(p);
      return v ? n + v.split(",").length : n;
    }, 0) +
    SINGLE_PARAMS.reduce((n, p) => (searchParams.get(p) ? n + 1 : n), 0);

  return (
    <>
      <aside className="hidden lg:block" aria-label="Filters">
        <div className="sticky top-[72px]">
          <h2 className="mb-4 text-sm font-semibold text-foreground">Filters</h2>
          <CustomerFilters />
        </div>
      </aside>

      <div className="lg:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button variant="secondary" size="md">
              <SlidersHorizontal className="h-4 w-4" />
              Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 overflow-y-auto p-0">
            <SheetHeader>
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription className="sr-only">
                Filter the customer list
              </SheetDescription>
            </SheetHeader>
            <div className="px-4 pb-10">
              <CustomerFilters />
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </>
  );
}
