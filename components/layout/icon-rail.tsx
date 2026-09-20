"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import { NAV_ITEMS, activeNavHref } from "@/lib/nav";
import { BrandMark } from "./brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { LogoutButton } from "@/components/layout/logout-button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * 56px primary icon rail (Design System §11, SoT D-41). Visible md+; below md
 * navigation moves to the top-bar hamburger sheet. Active item = ink icon +
 * heavier stroke + teal indicator bar + subtle surface (not color alone).
 */
export function IconRail() {
  const pathname = usePathname();
  const active = activeNavHref(pathname);

  return (
    <nav
      aria-label="Primary"
      className="sticky top-0 hidden h-dvh w-14 shrink-0 flex-col items-center border-r border-border bg-background py-3 md:flex"
    >
      <Link
        href="/dashboard"
        aria-label="JourneyX — Dashboard"
        className="mb-4 flex h-10 w-10 items-center justify-center rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <BrandMark className="h-7 w-7" />
      </Link>

      <ul className="flex flex-col items-center gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = active === item.href;
          const Icon = item.icon;
          return (
            <li key={item.href}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    aria-label={item.label}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "relative flex h-10 w-10 items-center justify-center rounded-md transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-surface-alt text-ink"
                        : "text-text-secondary hover:bg-surface-alt hover:text-ink",
                    )}
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={isActive ? 2.25 : 1.75}
                    />
                    {isActive && (
                      <span
                        aria-hidden
                        className="absolute inset-y-1.5 left-0 w-0.5 rounded-pill bg-teal"
                      />
                    )}
                  </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            </li>
          );
        })}
      </ul>

      <div className="mt-auto flex flex-col items-center gap-2">
        <LogoutButton />
        <ThemeToggle />
      </div>
    </nav>
  );
}
