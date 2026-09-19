"use client";

import { Bell } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Notification bell (Design System §12/§27). This renders the shell affordance;
 * the live unread count (SWR 30s poll) and the notification panel (S-08) are
 * wired in a later milestone, preserving the approved SWR usage.
 */
export function NotificationBell() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Notifications">
          <Bell />
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">Notifications</TooltipContent>
    </Tooltip>
  );
}
