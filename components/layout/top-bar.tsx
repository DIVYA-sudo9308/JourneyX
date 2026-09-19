"use client";

import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/lib/nav";
import { MobileNav } from "./mobile-nav";
import { SearchTrigger } from "./search-trigger";
import { NotificationBell } from "./notification-bell";

/** Screen title shown in the top bar acts as the page H1 (Design System §12). */
function titleFor(pathname: string): string {
  if (pathname.startsWith("/customers")) return "Customers";
  const item = NAV_ITEMS.find(
    (i) => pathname === i.match || pathname.startsWith(`${i.match}/`),
  );
  return item?.label ?? "JourneyX";
}

/** 56px sticky top bar: title (left), search (center), notifications (right). */
export function TopBar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-surface px-4">
      <MobileNav />
      {/* Contextual chrome label, not the page heading — each page's content
          owns the single <h1> (PageHeader / PagePlaceholder). */}
      <p className="shrink-0 text-lg font-semibold tracking-[-0.01em] text-foreground">
        {titleFor(pathname)}
      </p>
      <div className="ml-2 hidden flex-1 justify-center md:flex">
        <SearchTrigger />
      </div>
      <div className="ml-auto flex items-center gap-1">
        <NotificationBell />
      </div>
    </header>
  );
}
