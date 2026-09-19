"use client";

import { SWRConfig } from "swr";

import { fetcher } from "@/lib/api/fetcher";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * Client providers mounted once at the root. SWR is configured but only the
 * search dropdown and notification bell will consume it (SoT §4.1); server
 * components fetch their own data and do not use this config.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <SWRConfig
        value={{
          fetcher,
          revalidateOnFocus: false,
          shouldRetryOnError: false,
        }}
      >
        <TooltipProvider delayDuration={400}>{children}</TooltipProvider>
      </SWRConfig>
    </ThemeProvider>
  );
}
