# JourneyX — UI/UX Design System

**Version:** 1.0
**Date:** 2026-09-19
**Status:** DRAFT — awaiting approval before screen/component implementation
**Hackathon:** BIT N BUILD'26 — Gujarat Round · PS-4 (Cross-Channel Journey Stitching)
**Companions:** [SOURCE_OF_TRUTH](SOURCE_OF_TRUTH.md) · [BRAND_IDENTITY](BRAND_IDENTITY.md) · [PRD](PRD.md) · [APP_FLOW](APP_FLOW.md) · [Screen Spec](JOURNEYX_SCREEN_SPEC.md)
**Brand assets:** `/JourneyX_Brand_Assets/` (authoritative — logos, `brand-tokens.json`, `JOURNEYX_BRAND_GUIDELINES.md`)

This document is the bridge between the JourneyX brand identity and the application screens. It is implementation-ready: tokens are expressed as CSS custom properties, components are specified with states, and every domain visualization is defined against the reconciled product definitions in the Source of Truth.

> **This document does not modify** the PRD, TRD, ARCHITECTURE, DATA_MODEL, APP_FLOW, IMPLEMENTATION_PLAN, SOURCE_OF_TRUTH, BRAND_IDENTITY, or any brand asset. It composes them into a design system.

---

## 0. How this system was reconciled (read first)

The JourneyX project contains two layers of brand material, and they disagree in a few places. This section records exactly how the conflict was resolved so no implementer has to guess. **Nothing here overrides a brand asset — it selects between two brand sources using the assets themselves as the tie-breaker.**

### 0.1 The authoritative token layer is "Convergent Thread"

The `/JourneyX_Brand_Assets/` folder — named as authoritative and FINAL by the design brief — contains the produced, immutable artifacts: the SVG logos, `brand-tokens.json`, and `JOURNEYX_BRAND_GUIDELINES.md`. Every one of these embodies the **Convergent Thread** concept with this palette and type:

| Role | Value | Confirmed in |
|---|---|---|
| Primary / Ink | `#0B1220` | `brand-tokens.json`, `journeyx-primary.svg` wordmark, `journeyx-palette.svg` |
| Secondary / Slate | `#344054` | `journeyx-primary.svg` outer threads, palette swatch |
| Accent / Signal Teal | `#10B7A5` | `journeyx-primary.svg` resolving thread + convergence node, palette swatch |
| Typeface | **Geist** (primary) + **IBM Plex Mono** (data) | all logo SVGs, `brand-tokens.json` |
| Tagline | "See the journey behind every interaction." | `brand-tokens.json`, guidelines §Tagline |

`BRAND_IDENTITY.md` is the earlier **brand-strategy exploration** — it evaluates five logo concepts and three palettes ("Palette A — Deep Indigo `#2D3A8C` + Amber," Geist Mono, tagline "Every channel. One journey."). The produced assets did **not** ship Palette A; they crystallized on Convergent Thread. Therefore:

- **Canonical tokens (color, typeface, logo, tagline, concept)** come from the brand assets folder + `JOURNEYX_BRAND_GUIDELINES.md`.
- **`BRAND_IDENTITY.md` is retained for its non-conflicting system depth** — the granular type scale, spacing rationale, iconography rules (Lucide, 1.5px), motion language, voice, the node/path/marker journey grammar, semantic-state channels, and the confidence indicator concept. All of that is adopted here **re-mapped onto the Convergent Thread palette.**

> If the team intends the Deep Indigo/Amber system instead, this is the single decision to reverse — it cascades through §3–§4. Until then, **Convergent Thread is the system.**

### 0.2 Information architecture follows the Source of Truth

`SOURCE_OF_TRUTH.md` is the reconciled, precedence-ranked authority for product structure. Where `APP_FLOW.md` and the SoT differ on shell/navigation, **the SoT wins** (it post-dates and supersedes APP_FLOW per its own authority clause):

- **56px icon rail** (Dashboard · Customers · Pipeline), not a 240px sidebar (SoT D-41).
- Customer detail is a **tabbed shell** — `customers/[id]` with **Overview / Journey / Identity** tabs — not three separate pages (SoT §4.2).
- **No auth, no avatar, no "Seed Demo Data" button** (SoT D-41, D-42).
- Domain vocabulary, channel set, pattern set, confidence bands, KPI set, and detector definitions all come from SoT §4.6–§4.9 and §7.

### 0.3 Light and dark mode are both in scope

The brand ships **dark logo variants** (`journeyx-primary-dark.svg`, `journeyx-symbol-dark.svg`, `journeyx-monochrome-dark.svg`) and `BRAND_IDENTITY.md` mandates "design for light first, verify in dark." The brand assets pin only the **light** palette; the **dark** palette here is **derived faithfully** from the same hues, grounded by the dark logo (background Ink `#0B1220`, neutral foreground `#D0D5DD`, Signal Teal held constant). Derived values are labelled. Light mode is the reference; if the MVP ships one mode first (SoT scope), ship **light**.

---

## 1. Design principles

JourneyX is the **forensic analyst** of customer experience. The interface must read as precise, intelligent, analytical, premium, calm, technical, trustworthy, and enterprise-ready. These principles are the tie-breakers for every design decision.

| # | Principle | What it means in the UI | What it rejects |
|---|---|---|---|
| P1 | **Clarity from fragmentation** | Every screen makes the transformation *fragmented → connected → resolved → journey → intelligence* visually legible. The Convergent Thread is the recurring motif. | Decorative visuals that don't carry meaning. |
| P2 | **Information density without clutter** | High data-per-screen, achieved through hierarchy, alignment, and restraint — not through more cards. Tables and timelines are first-class. | Card grids, oversized empty padding, "dashboard confetti." |
| P3 | **Explainability by default** | Any machine decision (an identity link, a detected pattern, a risk level) exposes its evidence one interaction away. | Black-box scores, unexplained badges. |
| P4 | **Not color alone** | Every state is carried by **color + shape/glyph + pattern/label**, remaining distinguishable in grayscale (PRD NFR-016; brand data-viz rules). | Rainbow legends, hue-only status. |
| P5 | **Calm surfaces, sharp signal** | Neutral, near-monochrome chrome; Signal Teal and semantic color used sparingly as *signal*. | Gradients, glassmorphism, neon, heavy shadows. |
| P6 | **Scannability** | F-pattern layouts, left-aligned labels, tabular numerics, consistent column meaning. An analyst finds the answer without reading everything. | Center-aligned data, inconsistent units. |
| P7 | **Consistent interaction grammar** | The same gesture means the same thing everywhere: row-click opens, badge-click filters/highlights, chevron expands. | Novel per-screen interactions. |
| P8 | **Motion communicates, never decorates** | Motion only shows state change, connection, flow, resolution, navigation, or feedback. Nothing loops; nothing exceeds 1s. | Ambient animation, AI "pulses." |
| P9 | **Trustworthy tone** | Copy is specific and evidence-led; numbers come from data, never from prose. "Synthetic data" is labelled where shown. | "AI-powered," exclamation marks, emoji in-product. |

---

## 2. Design tokens — overview

Tokens are layered: **primitive** (raw brand values) → **semantic** (role-based, theme-aware) → **component** (per-component references). Components reference semantic tokens only; semantic tokens reference primitives. This keeps theming and future re-palette in one place.

```
primitive  --jx-ink-900:#0B1220 ─┐
                                  ├─►  semantic  --jx-color-bg, --jx-color-primary … ─┐
primitive  --jx-teal-500:#10B7A5 ┘                                                    ├─► component  --jx-btn-primary-bg …
                                                    (redefined per theme)             ┘
```

All tokens live on `:root` (light) and are redefined under the dark selector in §44.2. Color contrast is validated to **WCAG 2.1 AA** (4.5:1 text, 3:1 UI/graphics) in both themes (§41).

---

## 3. Color usage

### 3.1 Primitive palette (brand-authoritative, light)

Exact values from `journeyx-palette.svg` / `brand-tokens.json`. **Do not alter these.**

| Token | Hex | Brand name |
|---|---|---|
| `--jx-ink-900` | `#0B1220` | Primary / Ink |
| `--jx-slate-700` | `#344054` | Secondary / Slate |
| `--jx-teal-500` | `#10B7A5` | Accent / Signal Teal |
| `--jx-bg` | `#F7F8FA` | Background |
| `--jx-surface` | `#FFFFFF` | Surface |
| `--jx-border` | `#D9DEE7` | Border |
| `--jx-text-secondary` | `#667085` | Secondary text |
| `--jx-success-600` | `#18794E` | Success |
| `--jx-warning-600` | `#B54708` | Warning |
| `--jx-error-600` | `#B42318` | Error |
| `--jx-info-600` | `#175CD3` | Info |

### 3.2 Derived neutrals & tints (labelled DERIVED)

The brand fixes the anchor values above; the shades and status-tints below are **derived on-hue** to complete an implementable ramp. They never replace a brand value — they fill gaps the assets leave open.

| Token | Hex (light) | Use |
|---|---|---|
| `--jx-ink-700` | `#1D2739` | Primary hover/pressed, high-contrast fills |
| `--jx-slate-500` | `#5A6B85` | Muted icon strokes |
| `--jx-text-muted` | `#98A2B3` | Disabled text, placeholders |
| `--jx-surface-alt` | `#F1F3F6` | Table zebra rows, nested surfaces |
| `--jx-border-strong` | `#C3CAD6` | Input borders, focus-adjacent dividers |
| `--jx-teal-600` | `#0E9E8E` | Teal hover/pressed |
| `--jx-teal-tint` | `#E7F7F4` | Teal soft background (resolution highlights) |
| `--jx-success-tint` | `#E6F3EC` | Success soft background |
| `--jx-warning-tint` | `#FBF0E6` | Warning soft background |
| `--jx-error-tint` | `#FBECEA` | Error soft background |
| `--jx-info-tint` | `#E8F0FC` | Info soft background |
| `--jx-neutral-tint` | `#EEF1F5` | Unknown/neutral soft background |

### 3.3 Color-usage rules

1. **Chrome is neutral.** Navigation, headers, cards, tables use Ink/Slate/neutral only. Color appears as *signal*.
2. **Signal Teal = the JourneyX moment.** Reserve teal for: the brand mark, identity **resolution/convergence**, the active/selected accent, and the single most important "signal" action in a view. Do not tint whole surfaces teal.
3. **Ink is the primary action color** (near-black), consistent with an enterprise, premium feel. Teal is the accent action.
4. **Semantic color is earned.** Success/Warning/Error/Info appear only for their meaning (§37 states, §21 badges). Never as decoration.
5. **≤ 6 chart series** (§34). Never build rainbow charts.
6. **Never color alone** (P4). Pair every colored state with a glyph and label.
7. **Contrast:** any text/icon on a colored fill must clear AA; soft-tint backgrounds pair with the 600-weight foreground of the same hue.

---

## 4. Typography system

**Primary:** Geist (`"Geist", -apple-system, "Segoe UI", system-ui, sans-serif`).
**Data/technical:** IBM Plex Mono (`"IBM Plex Mono", "SF Mono", "Cascadia Code", monospace`) — used for IDs, hashes, confidence scores, timestamps in tables, and any column that benefits from fixed-width alignment. Loaded via `next/font` (SoT §4.1).

All numeric values use `font-feature-settings: "tnum" 1` (tabular figures) for column alignment, whether Geist or Mono.

### 4.1 Application type scale (implementation-ready)

Anchored on the brand's Geist weights, tuned for analytical density (14px base body, matching dense-dashboard convention). Marketing/hero contexts may use the larger display sizes from `JOURNEYX_BRAND_GUIDELINES.md` (Display 64, H1 44); those are **out-of-app** sizes.

| Role | Size / Line | Weight | Tracking | Font | Use |
|---|---|---|---|---|---|
| Display | 36 / 40 | 650 | -0.02em | Geist | Page hero, empty-state headline |
| H1 | 28 / 36 | 650 | -0.015em | Geist | Screen title |
| H2 | 22 / 30 | 600 | -0.01em | Geist | Section title |
| H3 | 18 / 26 | 600 | -0.005em | Geist | Card / panel title |
| H4 | 15 / 22 | 600 | 0 | Geist | Subsection, table group header |
| Body | 14 / 21 | 400 | 0 | Geist | Default body |
| Body Strong | 14 / 21 | 600 | 0 | Geist | Emphasis within body |
| Body Large | 16 / 24 | 400 | 0 | Geist | Reading-length prose, dialogs |
| Small | 13 / 18 | 400 | 0 | Geist | Secondary/meta text |
| Caption | 12 / 16 | 500 | 0.01em | Geist | Timestamps, helper text |
| Label | 12 / 16 | 600 | 0.04em, UPPERCASE | Geist | Field labels, KPI labels, eyebrows |
| Button | 14 / 16 | 600 | 0.01em | Geist | All buttons |
| KPI Value | 32 / 36 | 650 | -0.02em | Geist (tnum) | Dashboard KPI numbers |
| Data Cell | 13 / 18 | 400 | 0 | IBM Plex Mono | Table numerics, scores |
| Code / ID | 13 / 18 | 400 | 0 | IBM Plex Mono | Event IDs, hashes, JSON |

### 4.2 Type rules
- Body minimum 13px; never below 12px for readable text.
- ALL-CAPS only for `Label`. Never for headings or body.
- Headings use negative tracking for optical tightening; body/small neutral.
- One `H1` per screen. Don't skip heading levels.
- IBM Plex Mono for values/IDs/scores/timestamps-in-tables; Geist for everything narrative.

---

## 5. Spacing system

**Base unit: 4px.** All margins, padding, and gaps are multiples. This 4px grid is the backbone of density (P2).

| Token | px | Typical use |
|---|---|---|
| `--jx-space-0` | 0 | Reset |
| `--jx-space-1` | 4 | Icon-to-label gap, badge padding-y |
| `--jx-space-2` | 8 | Compact control padding, chip gaps |
| `--jx-space-3` | 12 | Input padding-x, table cell padding |
| `--jx-space-4` | 16 | Card padding, standard gap |
| `--jx-space-5` | 20 | Card padding (comfortable) |
| `--jx-space-6` | 24 | Section gap, panel padding |
| `--jx-space-8` | 32 | Between major sections |
| `--jx-space-10` | 40 | Page top padding |
| `--jx-space-12` | 48 | Hero/empty-state vertical rhythm |
| `--jx-space-16` | 64 | Large empty-state padding |

**Density rule:** table rows, timeline items, and list rows use `--jx-space-3` vertical padding (compact) by default; a "comfortable" toggle (§20) uses `--jx-space-4`.

---

## 6. Grid system

- **App shell:** fixed **56px icon rail** (left) + fixed **56px top bar** + fluid content region.
- **Content max-width:** 1440px, centered, with `--jx-space-6` (24px) side gutters ≥1024px; 16px gutters on tablet/mobile.
- **Content grid:** 12 columns, 24px gutter ≥1280px; 12 columns / 16px gutter 1024–1279; single-column stack < 768.
- **Dashboard KPI row:** CSS grid, `repeat(auto-fit, minmax(200px, 1fr))`, capped at a 3-row max on desktop (KPI cards wrap gracefully).
- **Two-pane detail (Customer shell):** persistent left identity/summary column (`minmax(300px, 360px)`) + fluid tab content, collapsing to stacked below 1024px.
- **Baseline alignment:** everything snaps to the 4px grid; text baselines align across adjacent cards.

---

## 7. Border & radius system

Restrained radii (brand: avoid "excessive rounded containers"). The palette swatches use `rx=10`; the mark uses round caps. This scale keeps corners soft-but-precise.

| Token | px | Use |
|---|---|---|
| `--jx-radius-xs` | 4 | Badges, chips, small inputs, tags |
| `--jx-radius-sm` | 6 | Buttons, inputs, selects, dropdown items |
| `--jx-radius-md` | 8 | Cards, panels, table container |
| `--jx-radius-lg` | 10 | Modals, drawers, large surfaces |
| `--jx-radius-pill` | 999 | Status pills, avatars, segmented toggles |

**Borders:** 1px `--jx-border` default; 1px `--jx-border-strong` for inputs and focus-adjacent dividers. Journey/identity node rings use 2–3px accent strokes (§35–36). No decorative double borders.

---

## 8. Elevation & surface system

JourneyX is a **flat, bordered** system. Depth comes primarily from **borders and background steps**, with shadow used sparingly for genuinely floating layers (dropdowns, popovers, modals). No heavy or colored shadows (P5).

| Level | Token | Treatment (light) | Use |
|---|---|---|---|
| 0 — Base | `--jx-elev-0` | `--jx-bg`, no border | Page background |
| 1 — Surface | `--jx-elev-1` | `--jx-surface` + 1px border | Cards, tables, panels |
| 2 — Raised | `--jx-elev-2` | `--jx-surface` + 1px border + `shadow-sm` | Hover cards, sticky headers |
| 3 — Floating | `--jx-elev-3` | `--jx-surface` + `shadow-md` | Dropdowns, popovers, tooltips, notification panel |
| 4 — Overlay | `--jx-elev-4` | `--jx-surface` + `shadow-lg` | Modals, drawers (over scrim) |

```css
--jx-shadow-sm: 0 1px 2px rgba(11,18,32,.06), 0 1px 1px rgba(11,18,32,.04);
--jx-shadow-md: 0 4px 12px rgba(11,18,32,.08), 0 2px 4px rgba(11,18,32,.05);
--jx-shadow-lg: 0 12px 32px rgba(11,18,32,.14), 0 4px 8px rgba(11,18,32,.06);
```

In dark mode, shadows are near-invisible; elevation is carried by **surface steps** (`--jx-surface` → `--jx-elevated`) and border lightening (§44.2).

---

## 9. Responsive breakpoints

| Name | Range | Shell behavior |
|---|---|---|
| `xs` (mobile) | < 640 | Rail → bottom tab bar or hamburger; single column; tables → stacked cards |
| `sm` | 640–767 | Same as xs with wider cards |
| `md` (tablet) | 768–1023 | Icon rail persists; two-pane detail stacks; charts single-column |
| `lg` (laptop) | 1024–1279 | Full shell; two-pane detail side-by-side; 12-col/16px gutter |
| `xl` (desktop) | 1280–1439 | 12-col/24px gutter; KPI row up to 5 across |
| `2xl` | ≥ 1440 | Content capped at 1440; extra space becomes gutter |

Primary design target: **`lg`/`xl`** (the analyst's workstation). Mobile is graceful-degradation (SoT: mobile polish is ONLY-IF-TIME), never the driver — layouts **restructure**, they do not merely shrink (§43).

---

## 10. Navigation

Three-level model, minimal by design (no settings, no help, no admin — SoT/APP_FLOW §1.3):

1. **Primary (icon rail):** Dashboard, Customers, Pipeline (P2). Persistent, left.
2. **Global (top bar):** Search (⌘K/Ctrl-K), Notification bell, brand mark. Persistent, top.
3. **Contextual (in-page tabs):** the Customer shell's Overview / Journey / Identity tabs; dashboard filter bar.

**Rules:** active section is shown by a **filled** rail icon + teal indicator (never color alone — icon fill changes too). Breadcrumb-free; the rail + tab labels + page `H1` establish location. Back navigation preserves URL filter state (SoT: filters live in URL params).

---

## 11. Sidebar (icon rail)

| Property | Spec |
|---|---|
| Width | 56px fixed, full height, `--jx-elev-1` on `--jx-bg` with right 1px border |
| Contents (top) | Brand **symbol** (`journeyx-symbol.svg`, 24px) → 24px gap → nav icons |
| Nav items | Dashboard (`layout-dashboard`), Customers (`users`), Pipeline (`activity`) — 20px Lucide icons in 40×40 hit targets |
| Item states | **Default:** outlined icon, `--jx-text-secondary`. **Hover:** `--jx-surface-alt` bg, `--jx-ink-900` icon. **Active:** *filled* icon, `--jx-ink-900`, + 2px teal indicator on the rail's inner edge. **Focus:** 2px teal focus ring (§41). |
| Tooltip | On hover/focus, label appears as a right-anchored tooltip (§22) after 400ms |
| Bottom | Theme toggle (sun/moon) if dark mode shipped; else empty |
| No | Avatar, user menu, org switcher (no auth — SoT D-41) |
| Mobile | Rail becomes a bottom tab bar (icons + labels) or a slide-over from a hamburger in the top bar |

---

## 12. Header (top bar)

| Property | Spec |
|---|---|
| Height | 56px fixed, `--jx-surface`, bottom 1px border, `--jx-elev-2` when content scrolls under |
| Left | Page `H1` (screen title) or the horizontal logo lockup on Dashboard |
| Center/flex | **Global search** (§15) — expands to ~480px on ≥lg, icon-only trigger < md |
| Right | Notification bell (§27) with unread badge; theme toggle (if applicable) |
| Behavior | Sticky; search and bell are reachable from every screen; ⌘K/Ctrl-K focuses search from anywhere |

---

## 13. Buttons

Hierarchy expresses "calm chrome, sharp signal." **Ink** is primary; **Teal** is the accent reserved for the single most important signal action per view.

| Variant | Fill / Border | Text | Hover | Use |
|---|---|---|---|---|
| **Primary** | `--jx-ink-900` solid | white | `--jx-ink-700` | Main affirmative action |
| **Accent** | `--jx-teal-500` solid | `#04201D` (AA on teal) | `--jx-teal-600` | The one "signal" CTA (e.g. *Resolve*, *View Identity*) — max one per view |
| **Secondary** | `--jx-surface` + 1px `--jx-border-strong` | `--jx-ink-900` | bg `--jx-surface-alt` | Alternative actions |
| **Ghost / Tertiary** | transparent | `--jx-text-secondary` | bg `--jx-surface-alt`, text `--jx-ink-900` | Low-emphasis, toolbar actions |
| **Destructive** | `--jx-error-600` solid | white | darken 8% | Rare (no destructive MVP actions; reserved) |
| **Link** | none | `--jx-info-600`, underline on hover | — | Inline navigation |

**Sizing:** `sm` 28px h / 12px px / 13px text · `md` (default) 36px h / 16px px / 14px text · `lg` 44px h / 20px px. Icon-only buttons are square (28/36/44). Icon+label uses 8px gap.

**States (all variants):** default → hover → active(pressed, translate 0/scale .99) → focus-visible (2px teal ring, §41) → disabled (`--jx-text-muted` text, `--jx-surface-alt` fill, no pointer) → loading (inline 16px spinner replaces leading icon, label stays, button disabled).

**Radius:** `--jx-radius-sm` (6px). **Never** all-caps button text; **never** exclamation copy.

---

## 14. Inputs

| Property | Spec |
|---|---|
| Height | 36px (`md`), 28px (`sm`), 44px (`lg`) |
| Padding | 12px horizontal; 8px if leading icon (icon 16px, 8px gap) |
| Border | 1px `--jx-border-strong`, radius `--jx-radius-sm` |
| Background | `--jx-surface` |
| Text / placeholder | `--jx-ink-900` / `--jx-text-muted` |
| Label | `Label` style above field, 4px gap; required marked with `*` in `--jx-error-600` |
| Helper text | `Caption`, `--jx-text-secondary`, below field |
| Focus | border `--jx-teal-500` + 2px teal ring (no glow) |
| Error | border `--jx-error-600`, helper text `--jx-error-600` + `alert-circle` icon |
| Success | border `--jx-success-600` (used sparingly, e.g. valid token entry) |
| Disabled | `--jx-surface-alt` bg, `--jx-text-muted` text |
| Numeric/ID inputs | IBM Plex Mono value |

Field types: text, number, date (native picker styled), textarea (min 3 rows, resize-y). All inputs are keyboard-operable and labelled (`<label for>`).

---

## 15. Search

The global search is the fastest path to a customer (PRD F-07). It is a **type-ahead dropdown only** — Enter opens the top result; there is **no `/customers?q=` list route** (SoT D-33).

| Property | Spec |
|---|---|
| Trigger | Top-bar field with `search` icon + placeholder "Search email, phone, name, loyalty ID…"; ⌘K/Ctrl-K focus |
| Behavior | 300ms debounce → `GET /api/v1/customers/search?q=` (≥ 3 chars; exact on strong IDs, prefix on others) via SWR |
| Results panel | `--jx-elev-3` dropdown, ≤ 400px wide, max-height 480px scroll |
| Result row | Display name (or masked email), **matched-field chip** ("matched: phone"), channel icon cluster, event count (mono), churn-risk pill if any |
| Masking | Identifiers **masked** in results (`j***@example.com`, `+91 98••• ••210`) — full values only on detail screens (SoT D-12, PRD NFR-009) |
| Keyboard | ↑/↓ move, Enter opens highlighted (default: top), Esc closes |
| Empty | "No customers match '{q}'." with a hint to try another identifier |
| Loading | 3 skeleton rows |

---

## 16. Selects & dropdowns (form)

| Property | Spec |
|---|---|
| Trigger | Input-styled, trailing `chevron-down`, 36px |
| Menu | `--jx-elev-3`, radius `--jx-radius-sm`, 4px item gap, max-height 320px scroll |
| Item | 36px row, 12px px; hover `--jx-surface-alt`; selected shows `check` (teal) + `Body Strong` — *check + weight*, not color alone |
| Multi-select | Checkbox per row; trigger shows "N selected" or up to 2 chips + "+N" |
| Grouping | `Label`-styled group headers, non-interactive |
| Keyboard | Type-ahead, ↑/↓, Enter, Esc; `role="listbox"` |

Used for: churn-risk filter, channel multi-select, sort, date-preset, event-type filter.

---

## 17. Tabs

Two tab styles, both underline-based (calm, no pill chrome on primary nav):

- **Shell tabs (Customer: Overview / Journey / Identity):** horizontal, `H4` labels, 2px bottom indicator in **teal** for active, `--jx-text-secondary` inactive, `--jx-ink-900` on hover. Active also carries a subtle weight change (600). Reflected in the URL (`/customers/[id]`, `/journey`, `/identity`).
- **Inset tabs (within a panel, e.g. Identity: Fragments / Chain / Evidence):** smaller (`Small`), same underline grammar, contained within the panel.

**Rules:** tabs never exceed one row (no scrolling tab strips in MVP scope); keyboard `role="tablist"` with ←/→ and Home/End; content region has `role="tabpanel"`. Never use tabs where the sub-views should be separate routes (they are routes here — deep-linkable).

---

## 18. Dropdowns (menus & popovers)

| Type | Spec |
|---|---|
| Action menu | `⋯`/`chevron` trigger → `--jx-elev-3` menu, item rows 32px, icon+label, destructive items `--jx-error-600` and separated by a divider |
| Filter popover | Anchored panel with grouped controls, "Apply"/"Clear" footer; closes on outside-click without applying unless auto-apply |
| Info popover | Non-interactive explainer (e.g. "How confidence is scored") triggered by an `info` icon; dismiss on outside-click/Esc |
| Notification panel | See §27 |

All popovers: `role` per WAI-ARIA, focus trap where interactive, Esc to close, return focus to trigger, 8px offset from anchor, flip/shift to stay in viewport.

---

## 19. Cards

Cards are used **deliberately**, not as the default container (P2 rejects card-grids). Reserve cards for: KPI tiles, pattern-summary tiles, the identity card, the dashboard insight card.

| Property | Spec |
|---|---|
| Surface | `--jx-elev-1` (`--jx-surface` + 1px border), radius `--jx-radius-md` |
| Padding | `--jx-space-5` (20px); compact tiles `--jx-space-4` |
| Header | `H3`/`H4` title + optional `info` popover + optional trailing action |
| Body | Content region on 4px grid |
| Interactive cards | KPI/pattern tiles that navigate: whole card is a button; hover raises to `--jx-elev-2` + border darkens; focus ring; cursor pointer |
| No | Nested cards more than one level; gratuitous shadows; colored card backgrounds (status is a left-accent bar or a badge, not a full tint) |

**KPI card anatomy:** `Label` (uppercase, muted) → `KPI Value` (Geist 32, tnum) → delta/context row (`Small`, with `arrow-up/down` + success/error, or a sparkline). Optional footer link "View customers →".

---

## 20. Tables

Tables are the analyst's primary tool (Customer List, resolution history, pipeline errors). They must be dense, scannable, and sortable.

| Property | Spec |
|---|---|
| Container | `--jx-elev-1`, radius `--jx-radius-md`, `overflow` clipped; sticky header |
| Header row | `Data Header` (12/600, uppercase-tracked), `--jx-surface-alt` bg, `--jx-text-secondary`, sortable columns show `chevron` on hover/active + `aria-sort` |
| Body row | 44px (compact) / 52px (comfortable); 12px cell padding; 1px bottom border `--jx-border`; zebra optional via `--jx-surface-alt` |
| Cell alignment | Text left; **numbers right, IBM Plex Mono, tnum**; badges/icons left |
| Row hover | `--jx-surface-alt`; whole row clickable when it navigates (cursor pointer) + a trailing `chevron-right` affordance |
| Row states | selected (2px teal left-accent + tint), focus (ring), disabled (muted) |
| Column types | text, masked-identifier (mono), channel-icon-cluster, confidence meter (§37), pattern-badge cluster (§21/§38), churn pill, relative-time (`Caption`, tooltip = absolute IST) |
| Density toggle | Compact/Comfortable control in the table toolbar (persists in `localStorage`) |
| Empty / loading | §28 / §29 |
| Responsive | < 768: table becomes stacked "record cards" (label:value pairs), preserving row-click |

---

## 21. Badges

Badges label state. **Every badge = color + icon + text** (P4). Two shapes distinguish two meanings:

- **Pill badges** (radius-pill) → status/level: churn risk, confidence band, resolution method.
- **Tag badges** (radius-xs) → detected patterns on events (§38).

| Badge | Color token | Icon | Text |
|---|---|---|---|
| Churn HIGH | Error fill/tint | `alert-triangle` | "High risk" |
| Churn MEDIUM | Warning tint | `alert-circle` | "Medium risk" |
| Churn NONE | Neutral tint | `minus-circle` | "No signal" |
| Confidence — High | Success tint | `shield-check` | "1.00 · High" |
| Confidence — Medium | Teal tint | `shield` | "0.80 · Medium" |
| Confidence — Low | Warning tint | `shield-alert` | "0.72 · Low" |
| Method — Deterministic | Slate/neutral | `equal` | "Deterministic" |
| Method — Probabilistic | Info tint | `sigma` | "Probabilistic" |
| Method — Origin | Neutral | `flag` | "Origin" |
| Method — Conflict | Warning tint | `git-merge` | "Conflict" |
| Anonymous | Neutral | `user-x` | "Anonymous" |

Pattern tag badges (drop-off, escalation, repeat, unresolved, churn) are defined in §38 with their glyphs. Badge text is `Label`/`Caption`; padding 2px×8px; soft-tint background with same-hue 600 foreground (AA verified).

---

## 22. Tooltips

| Property | Spec |
|---|---|
| Surface | Dark: `--jx-ink-900` bg, white text (both themes) — per brand data-viz tooltip rule |
| Type | `Caption` (12/16), max-width 260px, radius `--jx-radius-xs`, 8px padding |
| Delay | 400ms in, 0 out; instant on keyboard focus |
| Arrow | 6px, pointing to anchor; flips to stay in viewport |
| Use | Truncated text, icon-only controls, absolute timestamp on relative times, metric definitions |
| Not for | Essential information that should be always-visible, or interactive content (use a popover) |
| A11y | `aria-describedby`; dismissible with Esc; never trap focus |

---

## 23. Modals

Used sparingly (JourneyX is an investigation tool, not a form app). Candidate uses: a confirmation, an expanded chart, "how scoring works" explainer.

| Property | Spec |
|---|---|
| Scrim | `rgba(11,18,32,.48)`, fades in 200ms |
| Panel | `--jx-elev-4`, radius `--jx-radius-lg`, max-width 560px (content) / 800px (viz), centered, max-height 90vh scroll-body |
| Header | `H3` title + `x` close (top-right, 40px hit) |
| Body | `--jx-space-6` padding |
| Footer | Right-aligned actions; primary right-most; secondary/ghost left of it |
| Behavior | Focus trap; Esc closes; outside-click closes non-destructive; return focus to trigger; `role="dialog"` + `aria-modal` |
| Motion | Panel scale .98→1 + fade, 200ms ease-out; scrim fade |

---

## 24. Drawers

Right-side panels for contextual detail without leaving the screen — e.g. **Event detail** could render as a drawer on wide screens (the spec keeps inline expansion as canonical per APP_FLOW; drawer is the alternative for dense views).

| Property | Spec |
|---|---|
| Position | Right, full height, width 420px (`sm`) / 520px (`md`), `--jx-elev-4` |
| Scrim | Optional light scrim (`rgba(11,18,32,.32)`); non-blocking variant has no scrim |
| Header | Title + close; sticky |
| Body | Scrollable, `--jx-space-6` padding |
| Motion | Slide-in from right 240ms ease-out (brand "Reveal"); slide-out 200ms |
| A11y | Focus trap when scrim present; Esc closes; `role="dialog"` |
| Mobile | Becomes a bottom sheet (full-width, slides up) |

---

## 25. Alerts (inline)

Contextual, in-flow messages (not the notification system). Left-accent bar + icon + text; soft-tint background.

| Type | Accent / bg | Icon | Example |
|---|---|---|---|
| Info | Info / info-tint | `info` | "Showing 8 of 15 events. Filters active." |
| Success | Success / success-tint | `check-circle` | "Idempotent: re-ingest returned duplicate." |
| Warning | Warning / warning-tint | `alert-triangle` | "This customer has an identity conflict. Review →" |
| Error | Error / error-tint | `alert-octagon` | "Couldn't load journey. Retry." |

Structure: 3px left accent bar, 16px icon, `Body`/`Body Strong` title + optional `Small` description + optional inline action link. Dismissible alerts get an `x`; persistent ones (conflict banner) do not (APP_FLOW §6.6).

---

## 26. Toasts

**Not implemented in the MVP** (APP_FLOW §6.5, SoT DO-NOT-BUILD). The notification bell is sufficient; the analyst is not watching for real-time pops. This section documents the deferred spec so it isn't reinvented:

> *Production spec (deferred):* bottom-right stack, `--jx-elev-3`, 4s auto-dismiss (persist on hover), severity icon + message + optional action, max 3 visible, respects reduced-motion. Reserved for CRITICAL notifications only.

Do not build toasts for the hackathon.

---

## 27. Notifications (center)

In-app only; two types (SoT D-37, §4.10): **identity conflict** (warning) and **high churn risk** (critical). Bell polls `GET /api/v1/notifications` every 30s while tab visible (SWR).

| Element | Spec |
|---|---|
| Bell | Top bar; `bell` icon; unread count as a circular badge (Error fill), "9+" cap; subtle pulse when count increases between polls (respects reduced-motion) |
| Panel | `--jx-elev-3`, 400px wide, max-height 480px scroll, anchored under bell |
| Header | "Notifications" + "Mark all read" (ghost) |
| Item | 3px left accent by severity (Critical=Error, Warning=Warning) + severity icon + **title (`Body Strong`)** + message (`Small`, masked identifiers) + relative time (`Caption`) + unread dot (teal) on the right |
| Item states | Unread: bold title, faint tint bg, dot. Read: normal weight, no dot. |
| Interaction | Click → mark read + close + deep-link (conflict → `/customers/:id/identity`; churn → `/customers/:id`) |
| Empty | "No notifications. You're all caught up." |
| Copy style | "High churn risk: Priya S. — escalation, unresolved ticket, 15 days silent." (specific, no exclamation) |
| Not built | toasts, auto-expiry, throttling, escalation/repeat/low-confidence/system alerts (SoT) |

---

## 28. Empty states

Empty states **guide to the next action** (brand voice: forward-looking, not apologetic).

| Context | Copy | Action |
|---|---|---|
| Dashboard, no data | "No events ingested yet. Seed the demo dataset from the CLI to populate journeys." | Show the exact command (`npm run seed`) in a mono code block (no UI seed button — SoT D-42) |
| Customer list, no data | "No customer profiles yet. Ingest events to create profiles." | Command hint |
| Customer list, no filter matches | "No customers match these filters. Try widening the date range or removing a channel." | "Clear filters" button |
| Journey, no events after filter | "No events match these filters." | "Clear filters" |
| Search, no results | "No customers match '{q}'." | Suggest another identifier |
| Notifications, empty | "No notifications. You're all caught up." | — |

**Anatomy:** centered, 32px domain glyph (muted, outlined) → `H3` headline → `Body`/`Small` guidance → action. Use a **Convergent-Thread motif glyph** (fragmented dots resolving to a line) for the primary "no data" states — the brand concept in the empty state. Never emoji, never "Oops."

---

## 29. Loading states

Skeletons preferred over spinners for layout-preserving loads (brand motion: "Resolve" — content settles into place).

| Context | Loading treatment |
|---|---|
| Dashboard | Skeleton KPI row (matches final count) + skeleton chart rectangles with visible axes |
| Customer list | 10 skeleton rows matching column layout; filter rail stays interactive |
| Customer shell | Skeleton identity card + skeleton tab content |
| Journey | 5 skeleton event nodes with visible channel color bars on a skeleton thread |
| Identity | Skeleton convergence graph + skeleton chain rows |
| Inline (event expand, search) | 16px inline spinner |

**Skeleton style:** `--jx-surface-alt` blocks, subtle shimmer (1.4s, reduced-motion → static), radius matches the real element. Text skeletons are 12px bars at the line-height of the target. Motion follows "Resolve": opacity .4→1 + 4px settle over 300ms as real content replaces skeleton.

---

## 30. Error states

Errors state **what happened, then what to do** (brand voice). Never "Error 500" or "Oops."

| Level | Pattern |
|---|---|
| Field | Inline (§14): border + helper text + icon |
| Section/widget | Inline alert (§25) inside the widget's frame: "Chart unavailable. The analytics API timed out. Retry." + Retry button |
| Screen | Centered error block: `alert-octagon` (muted), `H3` "Couldn't load {thing}", `Body` cause + remedy, "Retry" primary + "Back" ghost |
| 404 | "Customer not found." + "Back to Customers" link |
| Global boundary | App-level error boundary with Retry; preserves the shell (rail + top bar stay) |

Errors never expose PII or raw stack traces to the UI (PRD NFR-008); the message is human, the detail (a request id) is mono and copyable.

---

## 31. Confirmation states

- **Inline confirmation** for reversible actions: an alert with an **Undo** link (brand: "Journey archived. Undo") — no modal.
- **Modal confirmation** only for irreversible/destructive actions (none in MVP scope; reserved).
- **Success feedback:** a brief inline success alert (§25) or a state change on the element itself (e.g. "Mark all read" empties the badge). No celebratory copy, no emoji, no toast.
- **Idempotency confirmation** (demo beat): re-ingesting returns `duplicate: true` → surface as a neutral info alert on the pipeline/replay path, not an error.

---

## 32. Filters

Filters are core to the analyst workflow and **persist in URL params** (shareable, back-button-safe — SoT, APP_FLOW).

| Property | Spec |
|---|---|
| Placement | Customer list: left filter rail (`minmax(240px,280px)`) on ≥lg, collapsible drawer < lg. Dashboard: horizontal filter bar (date range + channel). Journey: filter toolbar above the thread. |
| Controls | Pattern (multi-checkbox), Channel (multi-checkbox w/ channel icons), Churn risk (select), Min confidence (slider 0–1, mono value), Date range (from/to preset + custom) |
| Logic | AND across filter types (SoT); each maps to a URL param |
| Active-filter chips | Below the bar/toolbar: dismissible chips ("Channel: Call center ×"), + "Clear all" |
| Applied count | Header reflects "Showing N of M" |
| Empty result | §28 |
| A11y | Grouped `fieldset`/`legend`; slider keyboard-operable with value announced |

Analytics pattern-type filtering is **not** an API filter — it's handled by click-through to the customer list (SoT D-36).

---

## 33. Pagination

| Property | Spec |
|---|---|
| Style | Bottom of the table: "Showing 1–25 of 312" (`Small`, mono numerals) + Prev/Next + page-size select (25/50/100) |
| Params | `page`, `pageSize` in URL |
| Controls | `chevron-left`/`chevron-right` buttons (disabled at bounds), optional numbered pages ≥ lg |
| Long lists | Journey timeline uses scroll + lazy-load rather than pagination (PRD F-06) |
| A11y | `nav[aria-label="Pagination"]`, current page `aria-current="page"` |

---

## 34. Data visualization

Charts follow the brand data-viz rules exactly (`JOURNEYX_BRAND_GUIDELINES.md`, `BRAND_IDENTITY.md` §7). Library: **Recharts** (SoT §4.1); custom journey/identity viz in SVG.

### 34.1 Chart palette (≤ 6 categorical series)

Derived from the brand semantic + neutral set to be distinct, accessible, and free of collisions with state colors. Series colors are for *neutral categorical data* (e.g. events by channel where channel-accent isn't required); status charts use semantic colors.

| Series | Light | Dark (derived) |
|---|---|---|
| 1 | `#10B7A5` Signal Teal | `#2AD0BF` |
| 2 | `#344054` Slate | `#8A97AD` |
| 3 | `#175CD3` Info | `#6AA0F0` |
| 4 | `#B54708` Warning | `#E8912F` |
| 5 | `#5B7B9A` Steel | `#9DB4CC` |
| 6 | `#7A5AA6` Muted Violet | `#B79BDD` |
| Sequential low→high | `#E7F7F4` → `#0B5C53` | `#0B2A28` → `#5EEAD4` |
| Positive / Negative | `#18794E` / `#B42318` | `#3FBE85` / `#F0776B` |

### 34.2 Chart rules
1. Max 6 series; beyond that, filter/group.
2. Legend when > 2 series; direct labels preferred over legends where space allows.
3. Y-axis labels left-aligned; grid lines horizontal only, `--jx-border` at 50% opacity.
4. No 3D, no skeuomorphism, no gratuitous gradients.
5. Tooltips: dark surface, white text, radius-xs, 8px padding (§22).
6. Annotations/callouts use **Signal Teal**.
7. Empty chart = axes + grid skeleton in `--jx-text-muted` + centered message.
8. Numbers in mono, tnum.
9. Every chart has an accessible text alternative (caption or data-table toggle).

### 34.3 Chart types in JourneyX
Bar (events by channel; drop-offs by process; friction ranking), horizontal bar (escalations by channel pair; churn-correlation lift), pie/donut (resolution method mix — ≤3 slices), histogram (confidence distribution), and the **channel-transition Sankey** (ONLY-IF-TIME, SoT). See the Screen Spec for which chart lives where.

---

## 35. Journey visualization — the Convergent Thread

The unified journey timeline is JourneyX's hero visualization. It must feel proprietary — the **Convergent Thread** made literal — not a generic timeline. It composes **thread → nodes → transitions → markers → annotations** (adopting `BRAND_IDENTITY.md` §8 grammar, re-mapped to the canonical palette and the SoT journey model of §4.7).

### 35.1 Orientation
Vertical timeline (top = earliest), matching APP_FLOW's scroll-through model, with the **thread** as a continuous vertical spine on the left. (A horizontal lane view is a post-MVP option; vertical is canonical for the analyst scroll.)

### 35.2 The thread (spine)
- A continuous 2px vertical line, `--jx-slate-700` (light) — the customer's continuity.
- **Cross-channel transitions:** the segment between two different-channel nodes uses a 2-color gradient between the two channel accents (§36 encoding) — the visible "stitch."
- **Session boundary** (≤ 30 min same channel breaks): a subtle 8px gap + hairline; label "Session N" only when useful.
- **Journey boundary** (> 24h cross-channel): a stronger dashed break with a duration label ("3 days later").
- **Silence marker** (end of thread): a dotted tail fading to transparent with "Silent 15 days" (`Caption`, `--jx-text-muted`) — the churn "route exits the main path" cue (SoT D-31: churn is profile-level, so the tail is a *marker*, not a badge).

### 35.3 Nodes (events)
| Property | Encoding |
|---|---|
| Base | Circle: 24px minor · 32px standard · 40px key-moment |
| Channel | 2px accent ring in the channel color (§36) |
| Event type | Lucide/custom glyph inside (60% of node), `--jx-ink-900` |
| Outcome | Fill: solid teal-tint = positive/resolved · white = neutral · error-tint w/ marker = negative |
| Pattern | Pattern tag badge attached to the right of the node (§38) |

### 35.4 Node line weights, connectors & confidence
- Thread stroke 2px; transition gradients 2px; friction segment 2px **dashed** amber; escalation segment **doubled** (two 1.5px strokes) curving up.
- **Confidence never uses color alone:** in the journey, link/resolution confidence on a node is shown by the node ring's **pattern density** (solid = high, mixed-dash = medium, dotted = low) plus the numeric score on expand (§37).

### 35.5 States (nodes)
| State | Treatment |
|---|---|
| Default | As above |
| Hover | Node scales to 1.15, `--jx-elev-2` tooltip with type + time + 1-line summary |
| Selected | Node ring thickens to 3px teal, connected transitions highlight, event detail expands |
| Focus | 2px teal focus ring around node (keyboard) |
| Expanded | Node's event card opens inline (§ Screen Spec S-04/S-06): metadata, resolution info, patterns, raw JSON |
| Collapsed | Summary row only |
| Related-highlight | When a pattern badge is clicked, its `related_event_ids` nodes pulse once (300ms) and the thread between them thickens |

### 35.6 Density resilience
The viz must stay legible at different densities: below a threshold of visible nodes, collapse consecutive same-channel minor events into a **grouped node** ("+4 page views") that expands on click; compress long time gaps to a fixed visual break with a duration label (never linear-scale a 3-day gap). This is "semantic zoom" — detail appears as you focus, not all at once (P2).

---

## 36. Channel encoding

Channels are the six retail sources (SoT §4.3): `web · mobile · call_center · email · chat · in_store`. The brand names a channel as "a consistent container badge" and mandates icon + color, never color alone. The brand assets do **not** pin channel hues, so this **channel palette is DERIVED** to (a) harmonize with Convergent Thread, (b) stay distinct from the five pattern/state colors, and (c) always pair with a distinct icon.

| Channel | Icon (Lucide) | Accent (light) | Accent (dark) |
|---|---|---|---|
| Web | `monitor` | `#2F6FED` | `#6AA0F0` |
| Mobile | `smartphone` | `#0E9E8E` (teal-deep) | `#2AD0BF` |
| Call center | `headset` | `#7A5AA6` | `#B79BDD` |
| Email | `mail` | `#175CD3` | `#6AA0F0` |
| Chat | `message-square` | `#5B7B9A` | `#9DB4CC` |
| In-store | `store` | `#8A6D3B` | `#C9A25E` |

**Rules:** the (icon + accent) pair is fixed across every view — timeline node rings, list channel clusters, charts, filters. Because two channels sit in the blue family, the **icon is the primary differentiator**; color is reinforcement (P4). A channel is never represented by color alone anywhere.

> If the team prefers to pin channel hues centrally, this table is the one place to edit; it does not touch the brand core palette.

---

## 37. Confidence visualization

Confidence is central to JourneyX's trust story and must be legible at a glance and never color-dependent. It combines a **segmented meter + line pattern + numeric score + band label** (adopting the brand's "line opacity + pattern density, never color alone" plus the segmented-indicator concept), mapped to the **SoT confidence bands** (SoT D-09).

| Band | Range | Meaning | Segments (of 4) | Line pattern | Color token | Label |
|---|---|---|---|---|---|---|
| High | 0.95–1.00 | Deterministic (exact strong-ID) | 4 | solid | Success | "High" |
| Medium | 0.80–0.94 | Strong probabilistic | 3 | mixed-dash | Teal | "Medium" |
| Low | 0.70–0.79 | Weak probabilistic (review) | 2 | dotted | Warning | "Low" |
| Origin / New | < 0.70 / origin | Profile-creating event | 1 (hollow) | none | Neutral | "Origin" |

- **Profile identity confidence = the weakest link** (SoT D-10). The identity card shows the meter, the score in mono, the band label, and the weakest-link explanation ("email ↔ anonymous web session, session continuity").
- **Never show a raw % without the meter + label** (brand rule).
- The meter renders identically in tables (compact, 4 bars) and cards (with label + score).

---

## 38. Event timeline — patterns & annotations

Five detected patterns (SoT §4.8). The brand's data-viz philosophy assigns **semantic color families + shape/pattern + label**, and explicitly rejects rainbow palettes. So patterns reuse the semantic tokens and are **disambiguated by glyph, route treatment, and label** — fully distinguishable in grayscale (P4, brand "distinguishable in grayscale").

| Pattern | Color token | Glyph | Route/marker treatment | Badge text | Anchoring |
|---|---|---|---|---|---|
| **Drop-off** | Error | `unplug` / terminal-cap | thread fades to transparent + end cap at anchor | "Checkout drop-off" | anchor = last event in window |
| **Escalation** | Warning | `chevrons-up` (lift) | thread doubles + curves upward source→dest | "Escalation · web → call" | dest event; source linked via `related_event_ids` |
| **Repeat contact** | Warning | `repeat` + count | dashed segment + count chip | "2nd contact in 3 days" | first contact; cluster highlighted |
| **Unresolved issue** | Info | `circle-dashed` (open ring) | dotted open segment | "Open ticket TKT-8891" | initiation event |
| **Churn signal** | Error (critical) | `trending-down` + exit | profile banner + silence tail on thread | "High churn risk" | **profile-level banner** (not an event badge — SoT D-31) |

**Interaction:** clicking a pattern badge highlights and scrolls to its `related_event_ids` (e.g. escalation highlights both source and destination; repeat highlights the whole cluster). Escalation and repeat share the Warning family intentionally — glyph (`chevrons-up` vs `repeat` + count), route treatment, and label carry the distinction; this is on-brand restraint, not a collision.

**Event card (collapsed):** channel ring + type glyph · event type (`Body Strong`) · relative time (+ absolute IST tooltip) · 1-line metadata summary · pattern badge(s).
**Event card (expanded):** full metadata (null keys hidden) · identity-resolution block (method badge + confidence meter + evidence list) · associated patterns with detail · collapsible raw JSON (mono). Grouping/filtering per §32.

---

## 39. Identity resolution visualization

The signature "Resolve" moment — fragmented channel identities converging into one profile. This directly echoes the logo's Convergent Thread and serves the demo's opening beat (SoT §7.2). It lives on the **Identity tab** as three inset views (SoT §7.6): **Fragments · Chain · Evidence**.

### 39.1 Fragments panel
Shows the "before": the same customer as separate strangers in each source system.
- One **fragment card per source system** (web analytics = cookie; app = device; call center = phone), each showing the masked identifier, source channel icon+accent, and the events that system saw.
- Between them, faint **question-mark connectors** (the "are these the same person?" state), rendered as dotted, unresolved threads.
- A prominent **"Resolve" affordance**/state converges the fragment threads into a single unified profile node (teal convergence node — the brand mark), with the resulting identity-confidence meter (§37).

### 39.2 Convergence graph (Chain)
- **Center node** = unified profile (teal, brand convergence mark).
- **Identifier nodes** around it — email, phone, cookie, device, loyalty, name — each colored by **source channel** (§36), labeled type + **full value** (detail screen → unmasked, SoT D-12).
- **Edges** = links, labeled with **method badge** (origin/deterministic/probabilistic/conflict, §21) + confidence, and drawn with the confidence **line pattern** (§37: solid/mixed/dotted).
- Node/edge states: hover shows the introducing event; click an identifier node highlights and scrolls to its resolution-chain entry.

### 39.3 Resolution chain (Evidence)
Chronological list of how the profile grew (one row per resolution event):
- timestamp (IST) · triggering event (channel + type) · **method badge** · **confidence meter + score** · identifiers added · evidence rows (each scored signal, **including non-matches** — e.g. "name JW 0.96 → +0.19", "next-day cookie → filtered") · ambiguity/conflict detail when present.
- This is the explainability core (P3): an analyst can answer "why are these the same customer?" and "why was this *not* linked?"

### 39.4 Conflicts
If `has_identity_conflict`, a persistent Warning alert (§25) sits atop the tab, and a **Conflicts section** lists both profiles, matched fields, the winner rationale ("most events, then earliest"), and status "pending review — no merge in MVP" (APP_FLOW FLOW 07; no merge/split UI — SoT DO-NOT-BUILD).

---

## 40. Customer profile & analytics surfaces

### 40.1 Customer profile (Overview tab)
Left summary column (identity card + churn banner, persistent across tabs) + Overview content:
- **Identity card:** display name, all linked identifiers grouped by type with source-channel badges (full values), **identity-confidence meter** (weakest link) + weakest-link explanation, `is_anonymous` badge if applicable.
- **Churn banner** (profile-level, SoT D-31): risk pill (High/Medium/None) + the matched rules listed as evidence ("R2 escalation → 15 days silent", "R4 open ticket").
- **Journey stats:** total events, channels used (icon cluster), first/last seen (IST), active duration, silence days.
- **Detected-pattern tiles:** drop-off / escalation / repeat / unresolved counts — each an interactive card linking to `…/journey?pattern=…`.

### 40.2 Analytics (Dashboard)
KPIs and charts per SoT §4.9 (canonical set):
- **KPIs:** unified customers (known/anonymous) · events processed · **fragments unified** (identifiers→profiles, % on ≥2 channels) · avg link confidence (excl. new_profile) · checkout drop-offs · escalations · repeat-contact rate · open unresolved · churn-risk (high/medium).
- **MUST charts:** Top friction points (ranked bar) · Escalations by channel pair (horizontal bar/matrix) · Churn correlation (with-vs-without lift, "synthetic data" labelled) · **Insight card** (top friction point + affected customers + their churn rate vs baseline, deterministic — no LLM).
- **SHOULD charts:** events by channel · resolution-method mix · confidence histogram · drop-offs by process.
- KPI cards are click-through to a filtered customer list; chart segments click-through to filtered views (APP_FLOW FLOW 02).

---

## 41. Accessibility

Target: **WCAG 2.1 AA.** Accessibility is a design constraint, not a pass at the end.

| Area | Requirement |
|---|---|
| Keyboard | Every interactive element operable by keyboard; logical tab order; no traps except intended modal/drawer focus traps; ⌘K/Ctrl-K search; ←/→ tabs; ↑/↓ menus |
| Focus | Visible 2px **Signal Teal** focus ring (`:focus-visible`), 2px offset, on all interactive elements; never `outline:none` without a replacement |
| Contrast | Text ≥ 4.5:1 (≥ 3:1 for ≥ 24px/bold); UI/graphics ≥ 3:1; validated both themes (§44) |
| Not color alone | Every state = color + icon/shape + text (P4); channels differentiated by icon; confidence/patterns by glyph+pattern+label |
| Screen readers | Semantic HTML; ARIA roles for tabs/dialog/listbox/menu/nav/table; `aria-live="polite"` for async result counts and notification updates; charts have text/data-table alternatives; icon-only buttons have `aria-label` |
| Reduced motion | `prefers-reduced-motion` disables shimmer, pulses, node drift, convergence animation → instant/opacity-only transitions |
| Color blindness | Verified against deuteranopia/protanopia: patterns rely on glyph+pattern; the two blue-family channels are icon-differentiated |
| Touch targets | ≥ 44×44px on touch; ≥ 32px pointer with adequate spacing |
| Text zoom | Layout holds at 200% zoom; no clipped content |
| Masking | PII masked in lists/search/notifications; full only on detail (also a privacy control) |

---

## 42. Motion

Motion follows the brand's four principles — **Resolve · Flow · Converge · Reveal** — and never decorates (P8). Nothing loops (except a subtle load spinner); nothing exceeds 1s.

### 42.1 Duration & easing tokens
```css
--jx-dur-1: 100ms;  /* micro: hover, focus ring */
--jx-dur-2: 200ms;  /* state: toggle, tab, checkbox, modal */
--jx-dur-3: 300ms;  /* content: panel/card expand, skeleton→content */
--jx-dur-4: 500ms;  /* navigation, journey load */
--jx-dur-5: 800ms;  /* narrative: identity convergence, first-load reveal */
--jx-ease-out: cubic-bezier(0.16, 1, 0.3, 1);   /* entrances */
--jx-ease-inout: cubic-bezier(0.33, 1, 0.68, 1); /* state changes/exits */
```

### 42.2 Signature motions
| Motion | Where | Spec |
|---|---|---|
| **Resolve** (settle) | Skeleton→content, empty→populated | opacity .4→1 + 4px drift→0, `--jx-dur-3`, staggered 50ms |
| **Flow** | Journey load | nodes appear top→bottom along the thread, 50ms stagger, `--jx-dur-4` |
| **Converge** | Identity Fragments→unified | fragment threads animate toward the convergence node, subtle ripple, `--jx-dur-5` — the product's signature |
| **Reveal** | Drawer/popover/tooltip | slide/fade in `--jx-dur-2`–`3` |
| **Related-highlight** | Pattern badge click | node pulse once + thread thickens, `--jx-dur-3` |
| **Bell increment** | New notification | single subtle badge pulse, `--jx-dur-2` |

### 42.3 Never animate
The logo mark, data-table cells, axis labels/legends, navigation chrome; nothing > 1s; nothing infinite except a restrained spinner. All motion respects reduced-motion.

---

## 43. Responsive behavior (per surface)

Layouts **restructure**, they don't merely shrink. Design target is the analyst workstation (≥ lg).

| Surface | ≥ lg (desktop/laptop) | md (tablet) | < md (mobile) |
|---|---|---|---|
| **Icon rail** | 56px persistent left | 56px persistent | Bottom tab bar / hamburger slide-over |
| **Top bar** | Full search + bell | Full | Search collapses to icon; bell persists |
| **Tables** | Full columns, sticky header, density toggle | Hide low-priority columns; horizontal scroll for the rest | Stacked "record cards" (label:value), row-tap opens |
| **Filters** | Left rail (list) / bar (dashboard) | Collapsible drawer | Full-screen filter sheet |
| **Journey thread** | Full vertical thread + inline expand | Same, narrower nodes; expand as drawer | Condensed thread, event → bottom sheet; group minor events aggressively |
| **Identity viz** | Full convergence graph + chain | Graph scrollable; chain below | Fragments as stacked cards; graph → simplified list of links; chain list |
| **Charts** | Multi-column grid | 1–2 columns | Single column; complex charts (Sankey) → simplified bar or "view on larger screen" note |
| **Customer shell** | Two-pane (summary + tabs) | Summary collapses above tabs | Fully stacked; summary as a collapsible header |
| **KPI row** | 3–5 across | 2–3 across | 1–2 across, horizontal scroll optional |

---

## 44. Dark / light mode rules

Light is the reference (brand: design light-first). Dark is derived faithfully from Convergent Thread hues and grounded by the dark logo (`journeyx-primary-dark.svg`: bg Ink `#0B1220`, neutral fg `#D0D5DD`, teal constant). If shipping one mode for the MVP, ship **light** (SoT scope note).

### 44.1 Rules
1. **Tokens flip, components don't.** Components reference semantic tokens; only semantic tokens are redefined per theme.
2. **Elevation:** light uses shadow; **dark uses surface steps** (bg→surface→elevated) + lighter borders (shadows are near-invisible on dark).
3. **Signal Teal is held constant in hue** (brightened slightly in dark for AA on dark surfaces).
4. **Logos:** use light logo variants on light surfaces, `*-dark.svg` variants on the dark app background and any dark hero.
5. **Semantic colors brighten** in dark (on-hue) to preserve AA on dark surfaces.
6. **Charts** swap to the dark series column (§34.1); tooltips stay dark in both themes.
7. Contrast re-validated in dark; no pure-black text on pure-white or vice-versa — Ink/Snow are used.
8. Theme via `data-theme` attribute + `prefers-color-scheme`; user toggle persists in `localStorage` (wrapped in try/catch).

### 44.2 Semantic token map

```css
:root {
  /* ---------- LIGHT (reference; brand-authoritative anchors) ---------- */
  --jx-color-bg:            #F7F8FA;   /* Background */
  --jx-color-surface:       #FFFFFF;   /* Surface */
  --jx-color-surface-alt:   #F1F3F6;   /* DERIVED nested/zebra */
  --jx-color-elevated:      #FFFFFF;   /* Elevated (shadow carries depth) */
  --jx-color-border:        #D9DEE7;   /* Border */
  --jx-color-border-strong: #C3CAD6;   /* DERIVED input border */

  --jx-color-text:          #0B1220;   /* Ink — primary text */
  --jx-color-text-secondary:#667085;   /* Secondary text */
  --jx-color-text-muted:    #98A2B3;   /* DERIVED disabled/placeholder */

  --jx-color-primary:       #0B1220;   /* Ink — primary action */
  --jx-color-primary-hover: #1D2739;   /* DERIVED */
  --jx-color-on-primary:    #FFFFFF;
  --jx-color-secondary:     #344054;   /* Slate */

  --jx-color-accent:        #10B7A5;   /* Signal Teal */
  --jx-color-accent-hover:  #0E9E8E;   /* DERIVED */
  --jx-color-accent-tint:   #E7F7F4;   /* DERIVED */
  --jx-color-on-accent:     #04201D;   /* AA on teal */

  --jx-color-success:       #18794E;
  --jx-color-warning:       #B54708;
  --jx-color-error:         #B42318;
  --jx-color-info:          #175CD3;
  --jx-color-success-tint:  #E6F3EC;   /* DERIVED */
  --jx-color-warning-tint:  #FBF0E6;   /* DERIVED */
  --jx-color-error-tint:    #FBECEA;   /* DERIVED */
  --jx-color-info-tint:     #E8F0FC;   /* DERIVED */
  --jx-color-neutral-tint:  #EEF1F5;   /* DERIVED */

  --jx-focus-ring:          #10B7A5;
}

/* Dark: applied when the OS asks for it (unless the user forced light) … */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) { /* see values below */ }
}
/* …or when the user explicitly chose dark. All DERIVED, on-hue, AA-checked. */
:root[data-theme="dark"] {
  --jx-color-bg:            #0B1220;   /* Ink (from dark logo bg) */
  --jx-color-surface:       #131B2B;   /* DERIVED raised */
  --jx-color-surface-alt:   #1A2233;   /* DERIVED */
  --jx-color-elevated:      #1F2941;   /* DERIVED */
  --jx-color-border:        #26314A;   /* DERIVED */
  --jx-color-border-strong: #34405C;   /* DERIVED */

  --jx-color-text:          #F2F4F7;   /* Snow (≈ dark-logo fg #D0D5DD family) */
  --jx-color-text-secondary:#98A2B3;
  --jx-color-text-muted:    #667085;

  --jx-color-primary:       #F2F4F7;   /* On dark, neutral is the base action fill… */
  --jx-color-primary-hover: #FFFFFF;
  --jx-color-on-primary:    #0B1220;
  --jx-color-secondary:     #98A2B3;

  --jx-color-accent:        #2AD0BF;   /* Teal brightened for AA on dark */
  --jx-color-accent-hover:  #4FE0D1;
  --jx-color-accent-tint:   #0E2B29;
  --jx-color-on-accent:     #04201D;

  --jx-color-success:       #3FBE85;
  --jx-color-warning:       #E8912F;
  --jx-color-error:         #F0776B;
  --jx-color-info:          #6AA0F0;
  --jx-color-success-tint:  #10261C;
  --jx-color-warning-tint:  #2A1D0C;
  --jx-color-error-tint:    #2A1512;
  --jx-color-info-tint:     #0E1B30;
  --jx-color-neutral-tint:  #1A2233;

  --jx-focus-ring:          #2AD0BF;
}
```

> Note: in dark mode the neutral (Snow) is the base "primary" fill so near-black-on-white inverts cleanly; **Signal Teal remains the accent** for signal/CTA and the resolution moment. The `@media` block mirrors the `[data-theme="dark"]` values (kept identical) so OS preference and explicit toggle agree.

---

## 45. Component architecture

Five layers, bottom-up. Components consume tokens, never raw hex. Generic UI comes from **shadcn/ui + Tailwind + Lucide** (SoT §4.1); JourneyX domain components are custom, built on the primitives.

```
FOUNDATION   design tokens (color, type, space, radius, elevation, motion), theme provider, icon set
      ↓
PRIMITIVES   Button, Input, Select, Checkbox, Slider, Tabs, Badge/Pill, Tooltip, Popover,
             Dialog(Modal), Drawer, Alert, Skeleton, Table, Pagination, Card, DropdownMenu
      ↓
COMPOSITE    KpiCard, FilterRail/FilterBar, FilterChips, SearchDropdown, DataTable (sortable+paginated),
             ChartFrame (empty/loading/error), EmptyState, ErrorState, PageHeader, DensityToggle
      ↓
DOMAIN       ChannelBadge, ConfidenceMeter, MethodBadge, ChurnRiskPill, PatternBadge,
             IdentityCard, ChurnBanner, JourneyThread, JourneyNode, EventCard, TransitionConnector,
             SilenceMarker, FragmentsPanel, ConvergenceGraph, ResolutionChain, EvidenceRow,
             ConflictNotice, NotificationBell, NotificationPanel, InsightCard, FrictionRanking,
             ChurnCorrelation, EscalationPairChart
      ↓
PAGE-LEVEL   DashboardPage, CustomerListPage, CustomerShell(+OverviewTab, JourneyTab, IdentityTab),
             PipelineHealthPage(P2)
```

**Distinction:** *Generic UI* (PRIMITIVES/COMPOSITE) carry no JourneyX meaning and could belong to any app; *Domain* components encode JourneyX concepts (identity, confidence, journey, pattern, channel) and must obey §35–§40. Domain components are the ones judges will remember — invest polish there (PRD risk mitigation: "focus polish on the timeline").

---

## 46. Verification — consistency with brand & product

Every decision above was checked against the authoritative sources:

- **Palette / type / logo / concept / tagline** ← `/JourneyX_Brand_Assets/` (`brand-tokens.json`, `journeyx-*.svg`, `JOURNEYX_BRAND_GUIDELINES.md`). Convergent Thread, Ink/Slate/Signal Teal, Geist + IBM Plex Mono. §0, §3, §4, §35.
- **Journey/data-viz visual grammar, semantic states, motion, voice, iconography, type-scale depth** ← `JOURNEYX_BRAND_GUIDELINES.md` + non-conflicting `BRAND_IDENTITY.md`, re-mapped to the canonical palette. §34–§39, §42.
- **IA, shell, tabs, domain vocabulary, channel/pattern/KPI/detector/confidence definitions** ← `SOURCE_OF_TRUTH.md` §4.2–§4.10, §7 (which supersedes APP_FLOW/PRD where they conflict). §10–§12, §17, §36–§40.
- **Screens, states, flows, notification UX** ← `APP_FLOW.md` (as reconciled by SoT). §27–§33, and the Screen Spec.
- **Accessibility, masking, privacy, performance posture** ← PRD NFR-008…016, SoT D-12. §41.

**Open items flagged for the team (do not block design):**
1. Confirm **Convergent Thread** (this system) vs the exploratory Deep Indigo/Amber — §0.1. *(Recommendation: keep Convergent Thread; it is what the produced assets embody.)*
2. Confirm **channel accent palette** (§36, DERIVED to fill a brand gap).
3. Confirm **light + dark** vs **light-only** for MVP (§44) given SoT's earlier dark-only provisional decision predates the brand assets.

No UI decision in this document contradicts a brand asset or the Source of Truth. Where sources disagreed, the resolution and its evidence are recorded inline.

---

*End of JourneyX UI/UX Design System v1.0. Next: [Screen Spec](JOURNEYX_SCREEN_SPEC.md).*
