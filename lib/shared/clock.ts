/**
 * Single source of "now" for the app (SoT §4.8 clock rule). Detectors and
 * analytics are pure functions of `(events, asOf)`; every screen that renders
 * relative time or evaluates a time window reads `asOf` from here so a fixed
 * demo date (`DEMO_AS_OF`) is honored everywhere at once.
 */
export function asOf(): Date {
  const fixed = process.env.DEMO_AS_OF;
  return fixed ? new Date(fixed) : new Date();
}
