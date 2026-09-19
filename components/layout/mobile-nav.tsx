"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { NAV_ITEMS, activeNavHref } from "@/lib/nav";
import { BrandMark } from "./brand-mark";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

/** Below-md navigation: hamburger opens a left nav sheet (Design System §11, §43). */
export function MobileNav() {
  const pathname = usePathname();
  const active = activeNavHref(pathname);
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden"
          aria-label="Open navigation"
        >
          <Menu />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <BrandMark className="h-6 w-6" />
            JourneyX
          </SheetTitle>
          <SheetDescription className="sr-only">
            Primary navigation
          </SheetDescription>
        </SheetHeader>
        <nav aria-label="Primary" className="px-2 pb-4">
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = active === item.href;
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setOpen(false)}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-surface-alt text-ink"
                        : "text-text-secondary hover:bg-surface-alt hover:text-ink",
                    )}
                  >
                    <Icon className="h-5 w-5" strokeWidth={1.75} />
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </SheetContent>
    </Sheet>
  );
}
