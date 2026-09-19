/** Canonical channel set (SoT §4.3). Fixed order used for chart/legend display. */
export const CHANNELS = [
  "web",
  "mobile",
  "call_center",
  "email",
  "chat",
  "in_store",
] as const;

export type Channel = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<Channel, string> = {
  web: "Web",
  mobile: "Mobile",
  call_center: "Call center",
  email: "Email",
  chat: "Chat",
  in_store: "In-store",
};

/** Churn risk bands (SoT §4.8 detector output). */
export const CHURN_RISK_LEVELS = ["high", "medium", "none"] as const;
export type ChurnRisk = (typeof CHURN_RISK_LEVELS)[number];

/** Detected pattern types (SoT §4.8). */
export const PATTERN_TYPES = [
  "drop_off",
  "escalation",
  "repeat_contact",
  "unresolved_issue",
  "churn_signal",
] as const;
export type PatternType = (typeof PATTERN_TYPES)[number];

export const PATTERN_LABEL: Record<PatternType, string> = {
  drop_off: "Checkout drop-off",
  escalation: "Escalation",
  repeat_contact: "Repeat contact",
  unresolved_issue: "Unresolved issue",
  churn_signal: "Churn signal",
};
