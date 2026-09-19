# JourneyX

> See the journey behind every interaction.

Cross-channel journey intelligence platform — resolves fragmented customer
identities, stitches events into unified journeys, and surfaces the friction
that costs customers. Built for **BIT N BUILD'26** (Gujarat Round, PS-4).

This repository is being implemented in milestones against the approved
contract in [`docs/FRONTEND_IMPLEMENTATION_CHECKLIST.md`](docs/FRONTEND_IMPLEMENTATION_CHECKLIST.md).
The immutable sources of truth are in [`docs/`](docs/) and the brand system in
[`JourneyX_Brand_Assets/`](JourneyX_Brand_Assets/).

## Status

**Milestone 1 — Application foundation & shell.** Business screens
(Dashboard, Customers, Journey, Identity, Analytics, Search, Notifications)
are implemented in later milestones. The backend/API and database are separate
milestones (see `docs/SOURCE_OF_TRUTH.md` §4).

## Tech stack (resolved at Milestone 1, per SoT D-49)

| Layer | Choice | Version |
|---|---|---|
| Framework | Next.js (App Router, RSC) | 16.3.5 |
| UI runtime | React / React DOM | 19.3.0 |
| Language | TypeScript (strict) | 6.0.3 |
| Styling | Tailwind CSS + CSS custom properties | 3.4.19 |
| Components | shadcn/ui (hand-placed) + Radix primitives | — |
| Icons | lucide-react | 1.47.0 |
| Fonts | Geist Sans (`geist`) + IBM Plex Mono (`next/font/google`) | — |
| Client data | SWR (search dropdown + notification bell only) | 2.5.1 |
| Lint | ESLint (flat config) + eslint-config-next | 10.x |

> TypeScript is pinned to the 6.x line: `typescript@7` (the new native
> compiler) is not yet supported by `typescript-eslint`, which
> `eslint-config-next` depends on.

## Design system

The UI implements the **"Convergent Thread"** brand system. Tokens live as CSS
custom properties in [`app/globals.css`](app/globals.css) and are mapped into
Tailwind in [`tailwind.config.ts`](tailwind.config.ts). See
[`docs/JOURNEYX_UI_UX_DESIGN_SYSTEM.md`](docs/JOURNEYX_UI_UX_DESIGN_SYSTEM.md).

- Primary / Ink `#0B1220` · Secondary / Slate `#344054` · Accent / Signal Teal `#10B7A5`
- Geist Sans (UI) + IBM Plex Mono (data/IDs/scores)
- Light-first with a derived dark mode (both shipped)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:3000 — the root redirects to `/dashboard`.

## Scripts

| Script | Purpose |
|---|---|
| `npm run dev` | Start the dev server |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run lint` | ESLint (flat config) |
| `npm run typecheck` | `tsc --noEmit` |

## Project structure

```
app/                     App Router routes + root shell
  layout.tsx             Shell: icon rail + top bar + theme init
  page.tsx               Redirect → /dashboard
  dashboard|customers|pipeline/   route stubs (business screens land later)
  globals.css            Design tokens (Convergent Thread) + base styles
components/
  layout/                IconRail, TopBar, MobileNav, SearchTrigger,
                         NotificationBell, BrandMark, PagePlaceholder
  ui/                    shadcn primitives (button, tooltip, sheet, skeleton, separator)
  theme-provider.tsx     Light/dark theme (system + manual toggle)
lib/
  utils.ts               cn()
  nav.ts                 Primary navigation model
  api/fetcher.ts         SWR fetcher (client-only data paths)
docs/                    Immutable sources of truth
JourneyX_Brand_Assets/   Authoritative brand system (do not modify)
```
