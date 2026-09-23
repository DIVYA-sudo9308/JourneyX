import type { MetadataRoute } from "next";

/**
 * JourneyX is an authenticated internal dashboard over customer identity and
 * behaviour data — none of it should be indexed. Every route either sits
 * behind `proxy.ts` or is an API endpoint, so the policy is a blanket
 * disallow rather than a per-path list.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", disallow: "/" }],
  };
}
