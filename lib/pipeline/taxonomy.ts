import type { EventCategory } from "@/lib/types/customer";

/**
 * Canonical event taxonomy — PRD §10.3 verbatim, plus `account_closed`
 * (SoT D-30) and the `unknown` fallback category (SoT D-16). Detectors key on
 * these exact strings, so the map is the single place they are defined.
 */
export const EVENT_CATEGORIES: Record<string, EventCategory> = {
  // Browse
  page_view: "browse",
  product_view: "browse",
  search: "browse",
  category_view: "browse",
  // Commerce
  add_to_cart: "commerce",
  remove_from_cart: "commerce",
  checkout_start: "commerce",
  payment_attempt: "commerce",
  purchase_complete: "commerce",
  refund: "commerce",
  // Account
  signup: "account",
  login: "account",
  logout: "account",
  profile_update: "account",
  password_reset: "account",
  account_closed: "account",
  // Support
  ticket_created: "support",
  ticket_updated: "support",
  ticket_resolved: "support",
  ticket_closed: "support",
  call_started: "support",
  call_ended: "support",
  chat_started: "support",
  chat_ended: "support",
  email_sent: "support",
  email_received: "support",
  complaint_filed: "support",
  // Engagement
  notification_sent: "engagement",
  notification_opened: "engagement",
  email_campaign_opened: "engagement",
  email_campaign_clicked: "engagement",
  survey_completed: "engagement",
  review_submitted: "engagement",
  // In-store
  store_visit: "in_store",
  pos_transaction: "in_store",
  loyalty_scan: "in_store",
  return_processed: "in_store",
};

/** Unknown types are accepted and filed as `unknown` (SoT D-16), never rejected. */
export function categoryFor(eventType: string): EventCategory {
  return EVENT_CATEGORIES[eventType] ?? "unknown";
}

export function isKnownEventType(eventType: string): boolean {
  return eventType in EVENT_CATEGORIES;
}

/** Events that open an assisted-contact episode (SoT §4.8 repeat contact). */
export const CONTACT_START_TYPES = new Set([
  "ticket_created",
  "call_started",
  "chat_started",
  "email_sent",
  "complaint_filed",
]);

/** Events that close an issue (SoT §4.8 unresolved issue). */
export const RESOLUTION_TYPES = new Set(["ticket_resolved", "ticket_closed"]);

/** Events that open an issue which must later be resolved. */
export const ISSUE_TYPES = new Set(["ticket_created", "complaint_filed"]);

/**
 * Support tiers for escalation detection (SoT §4.8). A contact at tier T
 * preceded by a lower-tier interaction within 48 h is an escalation.
 */
export const CHANNEL_TIER: Record<string, number> = {
  web: 0,
  mobile: 0,
  in_store: 1,
  email: 1,
  chat: 2,
  call_center: 3,
};
