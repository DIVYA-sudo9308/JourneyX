import { asOf } from "@/lib/shared/clock";

import { raise } from "./shared";
import { client } from "./store";

export type NotificationType = "identity_conflict" | "churn_risk_high" | "unresolved_issue";

export interface NotificationItem {
  id: string;
  type: NotificationType;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  customerId: string | null;
  deepLink: string | null;
  read: boolean;
  createdAtIso: string;
}

export interface NotificationFeed {
  items: NotificationItem[];
  unread: number;
  asOfIso: string;
}

/** The bell shows the latest 20 (SoT §4.10). */
const FEED_LIMIT = 20;

interface NotificationRow {
  id: string;
  notification_type: NotificationType;
  severity: "info" | "warning" | "critical";
  title: string;
  message: string;
  customer_id: string | null;
  deep_link: string | null;
  read: boolean;
  created_at: string;
}

export async function getNotifications(): Promise<NotificationFeed> {
  const supabase = client();

  const [{ data, error }, unreadRes] = await Promise.all([
    supabase
      .from("notifications")
      .select("id, notification_type, severity, title, message, customer_id, deep_link, read, created_at")
      .order("created_at", { ascending: false })
      .limit(FEED_LIMIT),
    supabase.from("notifications").select("id", { count: "exact", head: true }).eq("read", false),
  ]);
  if (error) raise("notifications.list", error);
  if (unreadRes.error) raise("notifications.unread", unreadRes.error);

  return {
    items: ((data ?? []) as NotificationRow[]).map((row) => ({
      id: row.id,
      type: row.notification_type,
      severity: row.severity,
      title: row.title,
      message: row.message,
      customerId: row.customer_id,
      deepLink: row.deep_link,
      read: row.read,
      createdAtIso: row.created_at,
    })),
    unread: unreadRes.count ?? 0,
    asOfIso: asOf().toISOString(),
  };
}

/** Marks one notification read, or all of them when `id` is omitted. */
export async function markNotificationsRead(id?: string): Promise<number> {
  const supabase = client();
  let q = supabase.from("notifications").update({ read: true }).eq("read", false);
  if (id) q = q.eq("id", id);
  const { data, error } = await q.select("id");
  if (error) raise("notifications.read", error);
  return (data ?? []).length;
}
