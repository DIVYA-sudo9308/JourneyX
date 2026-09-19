"use client";

import * as React from "react";

type Theme = "light" | "dark" | "system";
type Resolved = "light" | "dark";

interface ThemeState {
  theme: Theme;
  resolved: Resolved;
}

interface ThemeContextValue extends ThemeState {
  setTheme: (theme: Theme) => void;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);
const STORAGE_KEY = "jx-theme";

/**
 * Inline this in <head> (before paint) to set the initial `data-theme` and
 * avoid a flash. Kept in sync with the store's resolution logic below.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var k='${STORAGE_KEY}';var s=localStorage.getItem(k);var m=window.matchMedia('(prefers-color-scheme: dark)').matches;var t=(s==='light'||s==='dark')?s:(m?'dark':'light');var r=document.documentElement;r.setAttribute('data-theme',t);r.style.colorScheme=t;}catch(e){}})();`;

/* ---------------------------------------------------------------------------
 * External theme store (localStorage + prefers-color-scheme). Using an external
 * store with useSyncExternalStore keeps rendering SSR-safe and avoids syncing
 * browser state through effect setState.
 * ------------------------------------------------------------------------- */

const SERVER_SNAPSHOT: ThemeState = { theme: "system", resolved: "light" };
let cache: ThemeState = SERVER_SNAPSHOT;
const listeners = new Set<() => void>();

function systemTheme(): Resolved {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readTheme(): Theme {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark" || value === "system") {
      return value;
    }
  } catch {
    // storage unavailable
  }
  return "system";
}

function compute(): ThemeState {
  const theme = readTheme();
  const resolved = theme === "system" ? systemTheme() : theme;
  return { theme, resolved };
}

function getSnapshot(): ThemeState {
  const next = compute();
  // Return a stable reference unless the value actually changed.
  if (cache.theme !== next.theme || cache.resolved !== next.resolved) {
    cache = next;
  }
  return cache;
}

function getServerSnapshot(): ThemeState {
  return SERVER_SNAPSHOT;
}

function subscribe(onChange: () => void): () => void {
  listeners.add(onChange);
  const mql = window.matchMedia("(prefers-color-scheme: dark)");
  mql.addEventListener("change", onChange);
  window.addEventListener("storage", onChange);
  return () => {
    listeners.delete(onChange);
    mql.removeEventListener("change", onChange);
    window.removeEventListener("storage", onChange);
  };
}

function setStoredTheme(theme: Theme) {
  try {
    localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // ignore — preference simply won't persist
  }
  listeners.forEach((listener) => listener());
}

function applyToDocument(resolved: Resolved) {
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const state = React.useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Sync the resolved theme to the DOM (an external system) — not React state.
  React.useEffect(() => {
    applyToDocument(state.resolved);
  }, [state.resolved]);

  const setTheme = React.useCallback((theme: Theme) => {
    setStoredTheme(theme);
  }, []);

  const toggle = React.useCallback(() => {
    setStoredTheme(cache.resolved === "dark" ? "light" : "dark");
  }, []);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ ...state, setTheme, toggle }),
    [state, setTheme, toggle],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = React.useContext(ThemeContext);
  if (!ctx) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return ctx;
}
