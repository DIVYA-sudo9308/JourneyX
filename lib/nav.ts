import { LayoutDashboard, Users, Activity, type LucideIcon } from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  /** Route prefix used to compute the active state. */
  match: string;
  icon: LucideIcon;
  /** P2 items are still routed but flagged for ordering/emphasis. */
  priority?: "p0" | "p2";
}

/**
 * Primary navigation (icon rail). Order and set are fixed by the Source of
 * Truth §4.2 / D-41: Dashboard, Customers, Pipeline. No settings, no admin,
 * no auth/avatar.
 */
export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    match: "/dashboard",
    icon: LayoutDashboard,
    priority: "p0",
  },
  {
    label: "Customers",
    href: "/customers",
    match: "/customers",
    icon: Users,
    priority: "p0",
  },
  {
    label: "Pipeline",
    href: "/pipeline",
    match: "/pipeline",
    icon: Activity,
    priority: "p2",
  },
];

/** Returns the nav item whose `match` prefix matches the current pathname. */
export function activeNavHref(pathname: string): string | null {
  const found = NAV_ITEMS.find(
    (item) => pathname === item.match || pathname.startsWith(`${item.match}/`),
  );
  return found?.href ?? null;
}
