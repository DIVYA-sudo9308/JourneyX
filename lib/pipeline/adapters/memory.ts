import { randomUUID } from "node:crypto";

import type { ChurnRisk, PatternType } from "@/lib/types/domain";

import type {
  EventInsert,
  IdentifierUpsert,
  IngestionLogInput,
  NewProfileInput,
  NotificationInput,
  PipelineStore,
  ProfileUpdate,
  ResolutionLogInsert,
} from "../store";
import type {
  DetectedPattern,
  IdentifierRecord,
  NormalizedIdentifier,
  ProfileRecord,
  ResolutionResult,
  StoredEventRecord,
} from "../types";

interface StoredPattern extends DetectedPattern {
  id: string;
  customerId: string;
}

interface StoredResolutionLog extends ResolutionLogInsert {
  id: string;
}

/**
 * In-memory `PipelineStore`. Used by the test suite to exercise the real
 * pipeline — the same `processEvent` code path the API runs — without a
 * database, and available to scripts for dry runs. It enforces the same
 * uniqueness rules as the SQL schema (dedup_key, one owner per strong
 * identifier, one pattern per key) so tests catch constraint violations.
 */
export class MemoryStore implements PipelineStore {
  profiles = new Map<string, ProfileRecord & { metadata: Record<string, unknown> }>();
  identifiers: IdentifierRecord[] = [];
  events: StoredEventRecord[] = [];
  patterns: StoredPattern[] = [];
  resolutionLogs: StoredResolutionLog[] = [];
  notifications: (NotificationInput & { id: string; read: boolean; createdAt: string })[] = [];
  ingestionLogs: (IngestionLogInput & { id: string; receivedAt: string })[] = [];

  private dedupKeys = new Map<string, string>();
  private eventDedup = new Map<string, string>();
  private sequence = 0;

  private nextId(prefix: string): string {
    this.sequence += 1;
    return `${prefix}_${String(this.sequence).padStart(6, "0")}`;
  }

  async findIdentifierOwners(identifiers: NormalizedIdentifier[]): Promise<IdentifierRecord[]> {
    const keys = new Set(identifiers.map((i) => `${i.type}:${i.value}`));
    return this.identifiers.filter((i) => keys.has(`${i.type}:${i.value}`));
  }

  async findIdentifiersForProfiles(customerIds: string[]): Promise<IdentifierRecord[]> {
    const ids = new Set(customerIds);
    return this.identifiers.filter((i) => ids.has(i.customerId));
  }

  async findProfiles(customerIds: string[]): Promise<ProfileRecord[]> {
    return customerIds
      .map((id) => this.profiles.get(id))
      .filter((p): p is ProfileRecord & { metadata: Record<string, unknown> } => Boolean(p));
  }

  async findEventsInWindow(
    customerIds: string[],
    fromIso: string,
    toIso: string,
  ): Promise<StoredEventRecord[]> {
    const ids = new Set(customerIds);
    const from = Date.parse(fromIso);
    const to = Date.parse(toIso);
    return this.events.filter((e) => {
      const t = Date.parse(e.timestampIso);
      return ids.has(e.customerId) && t >= from && t <= to;
    });
  }

  async findEventByDedupKey(dedupKey: string): Promise<{ id: string; customerId: string } | null> {
    const eventId = this.dedupKeys.get(dedupKey);
    if (!eventId) return null;
    const event = this.events.find((e) => e.id === eventId);
    return event ? { id: event.id, customerId: event.customerId } : null;
  }

  async createProfile(input: NewProfileInput): Promise<string> {
    const id = this.nextId("cust");
    this.profiles.set(id, {
      id,
      displayName: input.displayName,
      email: null,
      phone: null,
      loyaltyId: null,
      isAnonymous: true,
      channels: [input.channel],
      eventCount: 0,
      identityConfidence: 1,
      churnRisk: "none",
      patterns: [],
      firstSeenIso: input.firstSeenIso,
      lastActiveIso: input.lastActiveIso,
      hasIdentityConflict: false,
      metadata: {},
    });
    return id;
  }

  async upsertIdentifiers(upserts: IdentifierUpsert[]): Promise<void> {
    for (const up of upserts) {
      const existing = this.identifiers.find(
        (i) => i.customerId === up.customerId && i.type === up.type && i.value === up.value,
      );
      if (existing) {
        existing.lastSeenIso = maxIso(existing.lastSeenIso, up.seenAtIso);
        existing.firstSeenIso = minIso(existing.firstSeenIso, up.seenAtIso);
        continue;
      }
      // Mirrors `uq_strong_identifier`: a strong identifier has one owner.
      if (["email", "phone", "loyalty_id"].includes(up.type)) {
        const ownedElsewhere = this.identifiers.find(
          (i) => i.type === up.type && i.value === up.value && i.customerId !== up.customerId,
        );
        if (ownedElsewhere) continue;
      }
      this.identifiers.push({
        id: randomUUID(),
        customerId: up.customerId,
        type: up.type,
        value: up.value,
        sourceChannel: up.sourceChannel,
        linkMethod: up.linkMethod,
        linkConfidence: up.linkConfidence,
        firstSeenIso: up.seenAtIso,
        lastSeenIso: up.seenAtIso,
      });
    }
  }

  async insertEvent(input: EventInsert): Promise<string> {
    const existing = this.eventDedup.get(input.event.dedupKey);
    if (existing) return existing;

    const id = this.nextId("evt");
    this.events.push({
      id,
      customerId: input.customerId,
      channel: input.event.channel,
      eventType: input.event.eventType,
      eventCategory: input.event.eventCategory,
      timestampIso: input.event.timestampIso,
      metadata: input.event.metadata,
      identifiers: Object.fromEntries(
        input.event.identifiers.map((i) => [i.type, i.value]),
      ),
      resolutionMethod: input.method,
      resolutionConfidence: input.confidence,
    });
    this.dedupKeys.set(input.event.dedupKey, id);
    this.eventDedup.set(input.event.dedupKey, id);
    return id;
  }

  async insertResolutionLog(input: ResolutionLogInsert): Promise<void> {
    this.resolutionLogs.push({ id: randomUUID(), ...input });
  }

  async updateProfile(customerId: string, update: ProfileUpdate): Promise<void> {
    const profile = this.profiles.get(customerId);
    if (!profile) return;
    if (update.displayName !== undefined) profile.displayName = update.displayName;
    if (update.email !== undefined) profile.email = update.email;
    if (update.phone !== undefined) profile.phone = update.phone;
    if (update.loyaltyId !== undefined) profile.loyaltyId = update.loyaltyId;
    if (update.isAnonymous !== undefined) profile.isAnonymous = update.isAnonymous;
    if (update.channels) profile.channels = update.channels;
    if (update.eventCount !== undefined) profile.eventCount = update.eventCount;
    if (update.identityConfidence !== undefined) {
      profile.identityConfidence = update.identityConfidence;
    }
    if (update.churnRisk) profile.churnRisk = update.churnRisk as ChurnRisk;
    if (update.patterns) profile.patterns = update.patterns as PatternType[];
    if (update.firstSeenIso) profile.firstSeenIso = update.firstSeenIso;
    if (update.lastActiveIso) profile.lastActiveIso = update.lastActiveIso;
    if (update.hasIdentityConflict !== undefined) {
      profile.hasIdentityConflict = update.hasIdentityConflict;
    }
    if (update.metadata) profile.metadata = { ...profile.metadata, ...update.metadata };
  }

  async findProfileEvents(customerId: string): Promise<StoredEventRecord[]> {
    return this.events
      .filter((e) => e.customerId === customerId)
      .sort((a, b) => Date.parse(a.timestampIso) - Date.parse(b.timestampIso));
  }

  async upsertPatterns(customerId: string, patterns: DetectedPattern[]): Promise<void> {
    for (const pattern of patterns) {
      const existing = this.patterns.find(
        (p) => p.customerId === customerId && p.patternKey === pattern.patternKey,
      );
      if (existing) Object.assign(existing, pattern);
      else this.patterns.push({ id: randomUUID(), customerId, ...pattern });
    }
  }

  async deletePatternsExcept(customerId: string, keepKeys: string[]): Promise<void> {
    const keep = new Set(keepKeys);
    this.patterns = this.patterns.filter(
      (p) => p.customerId !== customerId || keep.has(p.patternKey),
    );
  }

  async createNotification(input: NotificationInput): Promise<void> {
    if (this.notifications.some((n) => n.dedupeKey === input.dedupeKey)) return;
    this.notifications.push({
      id: randomUUID(),
      read: false,
      createdAt: new Date().toISOString(),
      ...input,
    });
  }

  async insertIngestionLog(input: IngestionLogInput): Promise<void> {
    this.ingestionLogs.push({
      id: randomUUID(),
      receivedAt: new Date().toISOString(),
      ...input,
    });
  }

  /* -------- test helpers -------- */

  resolutionFor(eventId: string): ResolutionResult | null {
    return this.resolutionLogs.find((l) => l.eventId === eventId)?.result ?? null;
  }

  patternsFor(customerId: string): StoredPattern[] {
    return this.patterns.filter((p) => p.customerId === customerId);
  }

  identifiersFor(customerId: string): IdentifierRecord[] {
    return this.identifiers.filter((i) => i.customerId === customerId);
  }

  /** Event id → the dedup key it was stored under, for bulk persistence. */
  dedupKeysByEvent(): Map<string, string> {
    return new Map([...this.dedupKeys].map(([key, eventId]) => [eventId, key]));
  }
}

function maxIso(a: string, b: string): string {
  return Date.parse(a) >= Date.parse(b) ? a : b;
}

function minIso(a: string, b: string): string {
  return Date.parse(a) <= Date.parse(b) ? a : b;
}
