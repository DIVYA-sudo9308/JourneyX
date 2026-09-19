import type { Config } from "tailwindcss";
import tailwindcssAnimate from "tailwindcss-animate";

/**
 * JourneyX Tailwind configuration.
 * Colors reference CSS custom properties defined in app/globals.css so that
 * light/dark themes flip in one place (Design System §44). Do not hardcode
 * brand hex values here — the tokens are the single source of truth.
 */
const config: Config = {
  darkMode: ["selector", '[data-theme="dark"]'],
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // shadcn-compatible semantic aliases (theme-aware via CSS vars)
        border: "var(--jx-color-border)",
        input: "var(--jx-color-border-strong)",
        ring: "var(--jx-focus-ring)",
        background: "var(--jx-color-bg)",
        foreground: "var(--jx-color-text)",
        primary: {
          DEFAULT: "var(--jx-color-primary)",
          hover: "var(--jx-color-primary-hover)",
          foreground: "var(--jx-color-on-primary)",
        },
        secondary: {
          DEFAULT: "var(--jx-color-surface-alt)",
          foreground: "var(--jx-color-text)",
        },
        accent: {
          DEFAULT: "var(--jx-color-accent)",
          hover: "var(--jx-color-accent-hover)",
          tint: "var(--jx-color-accent-tint)",
          foreground: "var(--jx-color-on-accent)",
        },
        muted: {
          DEFAULT: "var(--jx-color-surface-alt)",
          foreground: "var(--jx-color-text-secondary)",
        },
        destructive: {
          DEFAULT: "var(--jx-color-error)",
          foreground: "#ffffff",
        },
        card: {
          DEFAULT: "var(--jx-color-surface)",
          foreground: "var(--jx-color-text)",
        },
        popover: {
          DEFAULT: "var(--jx-color-surface)",
          foreground: "var(--jx-color-text)",
        },
        // JourneyX brand + surface tokens (direct)
        surface: {
          DEFAULT: "var(--jx-color-surface)",
          alt: "var(--jx-color-surface-alt)",
          elevated: "var(--jx-color-elevated)",
        },
        ink: "var(--jx-ink-900)",
        slate: "var(--jx-slate-700)",
        teal: {
          DEFAULT: "var(--jx-color-accent)",
          hover: "var(--jx-color-accent-hover)",
          tint: "var(--jx-color-accent-tint)",
        },
        "text-secondary": "var(--jx-color-text-secondary)",
        "text-muted": "var(--jx-color-text-muted)",
        // semantic states
        success: {
          DEFAULT: "var(--jx-color-success)",
          tint: "var(--jx-color-success-tint)",
        },
        warning: {
          DEFAULT: "var(--jx-color-warning)",
          tint: "var(--jx-color-warning-tint)",
        },
        danger: {
          DEFAULT: "var(--jx-color-error)",
          tint: "var(--jx-color-error-tint)",
        },
        info: {
          DEFAULT: "var(--jx-color-info)",
          tint: "var(--jx-color-info-tint)",
        },
        neutral: {
          tint: "var(--jx-color-neutral-tint)",
        },
        // channel accents (identification only)
        channel: {
          web: "var(--jx-channel-web)",
          mobile: "var(--jx-channel-mobile)",
          "call-center": "var(--jx-channel-call-center)",
          email: "var(--jx-channel-email)",
          chat: "var(--jx-channel-chat)",
          "in-store": "var(--jx-channel-in-store)",
        },
      },
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-ibm-plex-mono)", "ui-monospace", "monospace"],
      },
      borderRadius: {
        xs: "var(--jx-radius-xs)",
        sm: "var(--jx-radius-sm)",
        md: "var(--jx-radius-md)",
        lg: "var(--jx-radius-lg)",
        pill: "var(--jx-radius-pill)",
      },
      boxShadow: {
        "jx-sm": "var(--jx-shadow-sm)",
        "jx-md": "var(--jx-shadow-md)",
        "jx-lg": "var(--jx-shadow-lg)",
      },
      transitionTimingFunction: {
        "jx-out": "cubic-bezier(0.16, 1, 0.3, 1)",
        "jx-inout": "cubic-bezier(0.33, 1, 0.68, 1)",
      },
      keyframes: {
        "jx-fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "jx-resolve": {
          from: { opacity: "0.4", transform: "translateY(4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "jx-fade-in": "jx-fade-in 200ms cubic-bezier(0.16,1,0.3,1)",
        "jx-resolve": "jx-resolve 300ms cubic-bezier(0.16,1,0.3,1)",
      },
    },
  },
  plugins: [tailwindcssAnimate],
};

export default config;
