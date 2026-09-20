"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

/**
 * Customer shell tabs (Screen Spec S-03, DS §17). These are real routes, so
 * they render as nav links with `aria-current` on the active one — not an ARIA
 * tablist widget. Active = teal underline + weight (not color alone).
 */
export function TabNav({ id }: { id: string }) {
  const pathname = usePathname();
  const base = `/customers/${id}`;
  const tabs = [
    { label: "Overview", href: base, active: pathname === base },
    {
      label: "Journey",
      href: `${base}/journey`,
      active: pathname === `${base}/journey`,
    },
    {
      label: "Identity",
      href: `${base}/identity`,
      active: pathname === `${base}/identity`,
    },
  ];

  return (
    <nav aria-label="Customer sections" className="border-b border-border">
      <ul className="flex gap-1">
        {tabs.map((tab) => (
          <li key={tab.href}>
            <Link
              href={tab.href}
              aria-current={tab.active ? "page" : undefined}
              className={cn(
                "-mb-px inline-flex h-10 items-center rounded-sm border-b-2 px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                tab.active
                  ? "border-accent font-semibold text-foreground"
                  : "border-transparent text-text-secondary hover:text-foreground",
              )}
            >
              {tab.label}
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
