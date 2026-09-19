import type { Metadata, Viewport } from "next";
import { GeistSans } from "geist/font/sans";
import { IBM_Plex_Mono } from "next/font/google";

import "./globals.css";
import { Providers } from "./providers";
import { THEME_INIT_SCRIPT } from "@/components/theme-provider";
import { IconRail } from "@/components/layout/icon-rail";
import { TopBar } from "@/components/layout/top-bar";

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "JourneyX",
    template: "%s · JourneyX",
  },
  description: "See the journey behind every interaction.",
  applicationName: "JourneyX",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f7f8fa" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${ibmPlexMono.variable}`}
    >
      <head>
        {/* Set the theme before paint to avoid a flash of the wrong mode. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        <Providers>
          <div className="flex min-h-dvh">
            <IconRail />
            <div className="flex min-w-0 flex-1 flex-col">
              <TopBar />
              <main className="flex-1">{children}</main>
            </div>
          </div>
        </Providers>
      </body>
    </html>
  );
}
