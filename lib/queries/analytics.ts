import { asOf } from "@/lib/shared/clock";
import type { AnalyticsSummary, DashboardFilters } from "@/lib/types/analytics";
import { CHANNELS } from "@/lib/types/domain";
import { getServerSupabase } from "@/lib/supabase/server";
import { summarizeAnalytics, type AnalyticsCustomer, type AnalyticsEvent, type AnalyticsPattern, type AnalyticsIdentifier } from "@/lib/analytics/summary";
import { QueryError, readAll, dateRange } from "./shared";
export { QueryError } from "./shared";

/** Paginate every aggregate input so PostgREST's row cap cannot skew KPIs. */
export async function getAnalyticsSummary(filters: DashboardFilters): Promise<AnalyticsSummary> {
  const { fromIso, untilIso } = dateRange(filters.dateFrom, filters.dateTo);
  if (filters.channel?.some((c) => !CHANNELS.includes(c))) throw new QueryError("Unknown channel.");
  const supabase = getServerSupabase();
  if (!supabase) {
    throw new QueryError("Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or SUPABASE_ANON_KEY) in .env.local.");
  }
  const [customers, events, patterns, identifiers] = await Promise.all([
    readAll<AnalyticsCustomer>("analytics.customers", (from, to) => supabase.from("customers")
      .select("id, is_anonymous, churn_risk").order("id").range(from, to)),
    readAll<AnalyticsEvent>("analytics.events", (from, to) => {
      let q = supabase.from("events").select("id, customer_id, channel, timestamp, metadata").order("id");
      if (fromIso) q = q.gte("timestamp", fromIso);
      if (untilIso) q = q.lt("timestamp", untilIso);
      if (filters.channel?.length) q = q.in("channel", filters.channel);
      return q.range(from, to);
    }),
    readAll<AnalyticsPattern>("analytics.patterns", (from, to) => {
      let q = supabase.from("patterns").select("id, customer_id, pattern_type, detected_at, metadata").order("id");
      if (fromIso) q = q.gte("detected_at", fromIso);
      if (untilIso) q = q.lt("detected_at", untilIso);
      return q.range(from, to);
    }),
    readAll<AnalyticsIdentifier>("analytics.identifiers", (from, to) => supabase.from("customer_identifiers")
      .select("id, customer_id, identifier_type, identifier_value").order("id").range(from, to)),
  ]);
  return summarizeAnalytics({ customers, events, patterns, identifiers }, filters, asOf().toISOString());
}
