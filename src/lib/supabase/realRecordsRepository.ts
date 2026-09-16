import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { DailyRecord, NormalizedEarthquake } from "../types";
import { getSupabaseAdmin } from "./supabaseAdmin";

export const AFTERWAVE_DAILY_RECORDS_TABLE = "afterwave_daily_records";

/** Row shape of `public.afterwave_daily_records` — see supabase/migrations/0001_create_afterwave_daily_records.sql. */
export interface AfterwaveDailyRecordRow {
  record_date: string;
  earthquake_id: string;
  magnitude: number;
  unit: string;
  place: string;
  depth_km: number | null;
  latitude: number;
  longitude: number;
  observed_at: string;
  source_updated_at: string | null;
  source_generated_at: string;
  requested_at: string;
  source_url: string;
  feed_url: string;
  raw_payload: unknown;
  created_at: string;
  updated_at: string;
}

/** Thrown for any Supabase-side failure (network, auth, constraint) — kept distinct from `BoardFetchError` (USGS-side) so callers can tell a live-data failure from a storage failure. */
export class StorageError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "StorageError";
  }
}

export interface RealUpsertInput {
  normalized: NormalizedEarthquake;
  /** The winning USGS feature exactly as received (before zod stripped anything) — stored verbatim for raw/stored/screen comparison. */
  rawFeature: unknown;
  /** The USGS feed's `metadata` object exactly as received (generated, url, count, status, api, ...). */
  rawMetadata: unknown;
}

/**
 * Storage abstraction for real (non-synthetic) daily records. The Supabase
 * implementation below is the only thing that talks to the network; tests
 * use an in-memory fake implementing the same interface (see
 * `__tests__/fakeRealRecordsRepository.ts`) so they never touch a live
 * table.
 */
export interface RealRecordsRepository {
  /** Upsert-by-record_date (Asia/Seoul day key): same KST date updates that one row; a new KST date inserts exactly one new row. Returns the row as stored. */
  upsertToday(input: RealUpsertInput): Promise<DailyRecord>;
  /** Most recent `count` records, ascending by record_date (oldest first) — matches the `computeChange([previous, current])` convention. */
  getLatest(count: number): Promise<DailyRecord[]>;
  /** Every real record, ascending by record_date. Only used for diagnostics — the hot path uses `getLatest`. */
  getAll(): Promise<DailyRecord[]>;
}

function buildUpsertPayload(input: RealUpsertInput): Omit<AfterwaveDailyRecordRow, "created_at"> {
  const { normalized, rawFeature, rawMetadata } = input;
  return {
    record_date: normalized.recordDate,
    earthquake_id: normalized.earthquakeId,
    magnitude: normalized.magnitude,
    unit: normalized.unit,
    place: normalized.place,
    depth_km: normalized.depthKm,
    latitude: normalized.latitude,
    longitude: normalized.longitude,
    observed_at: normalized.observedAt,
    source_updated_at: normalized.sourceUpdatedAt,
    source_generated_at: normalized.sourceGeneratedAt,
    requested_at: normalized.requestedAt,
    source_url: normalized.sourceUrl,
    feed_url: normalized.feedUrl,
    raw_payload: { feature: rawFeature, metadata: rawMetadata },
    // `created_at` is deliberately omitted: the column's DEFAULT now() sets
    // it only on the first INSERT for a record_date; Supabase's upsert only
    // touches the columns present in the payload, so a same-day conflict
    // update never overwrites the original creation time.
    updated_at: new Date().toISOString(),
  };
}

/** USGS's own `properties.mmi` is not a column in the requested schema — it lives inside `raw_payload.feature` and is recovered from there, never re-estimated. */
function extractMmiMax(rawPayload: unknown): number | null {
  if (!rawPayload || typeof rawPayload !== "object") return null;
  const feature = (rawPayload as { feature?: unknown }).feature;
  if (!feature || typeof feature !== "object") return null;
  const properties = (feature as { properties?: unknown }).properties;
  if (!properties || typeof properties !== "object") return null;
  const mmi = (properties as { mmi?: unknown }).mmi;
  return typeof mmi === "number" ? mmi : null;
}

export function rowToDailyRecord(row: AfterwaveDailyRecordRow): DailyRecord {
  return {
    earthquakeId: row.earthquake_id,
    magnitude: Number(row.magnitude),
    unit: "M",
    place: row.place,
    // depth_km is NOT NULL in every row this app writes; the column only
    // allows null defensively for rows inserted some other way.
    depthKm: row.depth_km === null ? 0 : Number(row.depth_km),
    latitude: Number(row.latitude),
    longitude: Number(row.longitude),
    mmiMax: extractMmiMax(row.raw_payload),
    observedAt: row.observed_at,
    sourceUpdatedAt: row.source_updated_at ?? row.observed_at,
    sourceGeneratedAt: row.source_generated_at,
    requestedAt: row.requested_at,
    recordDate: row.record_date,
    sourceUrl: row.source_url,
    feedUrl: row.feed_url,
    firstRecordedAt: row.created_at,
    lastUpdatedAt: row.updated_at,
  };
}

export function createSupabaseRealRecordsRepository(client?: SupabaseClient): RealRecordsRepository {
  // Resolved lazily per call (not captured at module scope) so importing
  // this module never requires env vars to already be set.
  const resolveClient = () => client ?? getSupabaseAdmin();

  return {
    async upsertToday(input) {
      const payload = buildUpsertPayload(input);
      const { data, error } = await resolveClient()
        .from(AFTERWAVE_DAILY_RECORDS_TABLE)
        .upsert(payload, { onConflict: "record_date" })
        .select()
        .single();
      if (error || !data) {
        throw new StorageError("실제 일별 기록 저장에 실패했습니다.", error);
      }
      return rowToDailyRecord(data as AfterwaveDailyRecordRow);
    },

    async getLatest(count) {
      const { data, error } = await resolveClient()
        .from(AFTERWAVE_DAILY_RECORDS_TABLE)
        .select("*")
        .order("record_date", { ascending: false })
        .limit(count);
      if (error) {
        throw new StorageError("실제 일별 기록 조회에 실패했습니다.", error);
      }
      return ((data ?? []) as AfterwaveDailyRecordRow[]).map(rowToDailyRecord).reverse();
    },

    async getAll() {
      const { data, error } = await resolveClient()
        .from(AFTERWAVE_DAILY_RECORDS_TABLE)
        .select("*")
        .order("record_date", { ascending: true });
      if (error) {
        throw new StorageError("실제 일별 기록 전체 조회에 실패했습니다.", error);
      }
      return ((data ?? []) as AfterwaveDailyRecordRow[]).map(rowToDailyRecord);
    },
  };
}
