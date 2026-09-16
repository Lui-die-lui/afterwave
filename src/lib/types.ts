import { z } from "zod";

/**
 * USGS GeoJSON summary feed — only the fields we actually depend on are
 * validated at runtime. `mag` is nullable in the real feed (some events are
 * still being reviewed), so callers must filter nulls before ranking.
 */
export const UsgsFeatureSchema = z.object({
  type: z.literal("Feature"),
  id: z.string().min(1),
  properties: z.object({
    mag: z.number().nullable(),
    place: z.string().nullable(),
    time: z.number(),
    updated: z.number(),
    url: z.string().url(),
    detail: z.string().optional(),
    title: z.string().optional(),
    magType: z.string().nullable().optional(),
    /** USGS's own maximum estimated Modified Mercalli Intensity for this event; not always present. */
    mmi: z.number().nullable().optional(),
  }),
  geometry: z.object({
    type: z.literal("Point"),
    coordinates: z.tuple([z.number(), z.number(), z.number()]),
  }),
});

export const UsgsFeedSchema = z.object({
  type: z.literal("FeatureCollection"),
  metadata: z.object({
    generated: z.number(),
    url: z.string().url(),
    title: z.string().optional(),
    status: z.number().optional(),
    count: z.number().optional(),
  }),
  features: z.array(UsgsFeatureSchema),
});

export type UsgsFeed = z.infer<typeof UsgsFeedSchema>;
export type UsgsFeature = z.infer<typeof UsgsFeatureSchema>;

/** Normalized representation stored & displayed by the app (real or synthetic). */
export interface NormalizedEarthquake {
  earthquakeId: string;
  magnitude: number;
  unit: "M";
  place: string;
  depthKm: number;
  latitude: number;
  longitude: number;
  /** USGS's own maximum estimated MMI for this event, straight from `properties.mmi`. Null means USGS hasn't published one — never estimated from magnitude. */
  mmiMax: number | null;
  /** ISO 8601 — when the earthquake occurred. */
  observedAt: string;
  /** ISO 8601 — when USGS last revised this specific event's data. */
  sourceUpdatedAt: string;
  /** ISO 8601 — when the USGS feed itself was generated. */
  sourceGeneratedAt: string;
  /** ISO 8601 — when this service finished the query that produced this value. */
  requestedAt: string;
  /** Asia/Seoul YYYY-MM-DD — daily record key. */
  recordDate: string;
  sourceUrl: string;
  feedUrl: string;
}

export interface DailyRecord extends NormalizedEarthquake {
  /** ISO 8601 — first time this KST date's row was created. */
  firstRecordedAt: string;
  /** ISO 8601 — last time this KST date's row was refreshed by a new success. */
  lastUpdatedAt: string;
}

export type ErrorCode =
  | "NONE"
  | "TIMEOUT"
  | "UPSTREAM_AUTH"
  | "RATE_LIMITED"
  | "OFFLINE"
  | "SCHEMA_CHANGED"
  | "UNKNOWN"
  /** Supabase (storage) failure — distinct from a USGS (live data) failure, per T04 §7: honestly tell the two apart rather than blaming the DB on USGS or vice versa. */
  | "STORAGE_ERROR";

export type BoardStatus = "fresh" | "stale" | "error" | "waiting";

export interface ChangeSummary {
  previousDate: string;
  previousMagnitude: number;
  currentDate: string;
  currentMagnitude: number;
  delta: number;
}

export interface BoardState {
  status: BoardStatus;
  errorCode: ErrorCode;
  errorTitle: string | null;
  errorMessage: string | null;
  errorAction: string | null;
  /** The value currently on screen — last good value if stale/error, fresh value otherwise. Null only when there has never been a success. */
  current: NormalizedEarthquake | null;
  lastSuccessAt: string | null;
  records: DailyRecord[];
  change: ChangeSummary | null;
  waitingForNextDay: boolean;
  requestedAt: string;
  timeZone: "Asia/Seoul";
  feedUrl: string;
  /**
   * Additive aliases kept alongside the fields above (never replacing them —
   * `records`/`change`/`current` remain the shape every existing component
   * reads) so the API response also satisfies the plain `{ dailyRecords,
   * dailyChange, lastSuccessfulRecord }` shape on its own.
   */
  dailyRecords: DailyRecord[];
  dailyChange: number | null;
  lastSuccessfulRecord: NormalizedEarthquake | null;
}

export interface SyntheticState extends BoardState {
  isSynthetic: true;
  lastScenario: string | null;
  anchorDate: string | null;
  day: 1 | 2 | null;
}
