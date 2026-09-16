import { computeChange } from "../change";
import { addDaysToDateKey, kstDateKey } from "../timezone";
import type { BoardState, DailyRecord } from "../types";

/**
 * Self-authored synthetic fixture for the "일별 비교 미리보기" (daily
 * comparison preview) Failure Lab scenario — see the provenance note in
 * `fixtures/syntheticFeed.ts`: no official asset package ships this
 * scenario, so these are clearly-labeled stand-in values, never presented as
 * real USGS data.
 *
 * Deliberately separate from `syntheticStore.ts` / `syntheticRunner.ts`:
 * this preview never calls `ingestFeed`/`upsertSyntheticRecord` (no write to
 * the synthetic JSON store either) and never imports `realStore.ts` or
 * anything under `lib/supabase/` — it only ever exists as an in-memory
 * object handed straight to the UI, so a page refresh (which drops all React
 * state) is enough on its own to return to the real data screen.
 */

export const DAILY_COMPARISON_PREVIEW_ID = "T04-DAILY-COMPARISON-PREVIEW";
const PREVIEW_FEED_URL = "synthetic-fixture://afterwave/daily-comparison-preview";

function buildDay(
  dateKey: string,
  opts: { id: string; magnitude: number; place: string; depthKm: number; latitude: number; longitude: number }
): DailyRecord {
  // Midday KST (03:45 UTC = 12:45 KST) keeps the timestamp solidly inside
  // `dateKey`'s calendar day regardless of which date it is — no midnight
  // rollover edge case to reason about.
  const observedAt = `${dateKey}T03:45:00.000Z`;
  const sourceGeneratedAt = `${dateKey}T04:00:00.000Z`;
  const requestedAt = `${dateKey}T04:01:00.000Z`;
  return {
    earthquakeId: opts.id,
    magnitude: opts.magnitude,
    unit: "M",
    place: opts.place,
    depthKm: opts.depthKm,
    latitude: opts.latitude,
    longitude: opts.longitude,
    mmiMax: null,
    observedAt,
    sourceUpdatedAt: observedAt,
    sourceGeneratedAt,
    requestedAt,
    recordDate: dateKey,
    // No live source — this record was never fetched from USGS, so there is
    // no real detail-page URL. The UI must hide/disable the USGS link
    // whenever it sees an empty sourceUrl on a preview record.
    sourceUrl: "",
    feedUrl: PREVIEW_FEED_URL,
    firstRecordedAt: requestedAt,
    lastUpdatedAt: requestedAt,
  };
}

export interface DailyComparisonPreview {
  id: string;
  /**
   * Ready-to-render BoardState. `records`/`dailyRecords` hold EXACTLY the
   * latest two (day-1, day0) so the map's existing "exactly 2 records"
   * previous-marker logic and `computeChange` behave identically to
   * production. `status: "fresh"` here is only the INTERNAL logic value
   * other components branch on (e.g. suppressing an error banner) — every
   * place that renders this to the user must check the separate `isPreview`
   * flag instead and show a distinct "합성 preview" badge rather than this
   * literal status.
   */
  boardState: BoardState;
  /**
   * Two days before `boardState.current` — shown only in the daily
   * comparison list, deliberately NOT part of `records`/`dailyRecords` so it
   * can never be mistaken for one of the two real-record slots or feed into
   * `computeChange`.
   */
  twoDaysAgo: DailyRecord;
}

/**
 * Builds the 3-record fixture relative to `now` (Asia/Seoul calendar), so it
 * never depends on a hardcoded date and stays self-consistent whenever it's
 * used — but the KST date keys it produces are ONLY ever placed into this
 * returned object, never upserted anywhere.
 */
export function buildDailyComparisonPreview(now: Date = new Date()): DailyComparisonPreview {
  const day0Key = kstDateKey(now);
  const day1Key = addDaysToDateKey(day0Key, -1);
  const day2Key = addDaysToDateKey(day0Key, -2);

  const day0 = buildDay(day0Key, {
    id: "synthetic-history-d0",
    magnitude: 5.0,
    place: "합성 시험 — 중앙아메리카 인근 해상 (self-authored fixture)",
    depthKm: 42.5,
    latitude: 14.5,
    longitude: -92.7,
  });
  const day1 = buildDay(day1Key, {
    id: "synthetic-history-d1",
    magnitude: 4.6,
    place: "합성 시험 — 일본 동쪽 해역 (self-authored fixture)",
    depthKm: 31.2,
    latitude: 37.4,
    longitude: 142.1,
  });
  const day2 = buildDay(day2Key, {
    id: "synthetic-history-d2",
    magnitude: 5.3,
    place: "합성 시험 — 남태평양 (self-authored fixture)",
    depthKm: 68.7,
    latitude: -20.4,
    longitude: -177.7,
  });

  const latestTwo = [day1, day0]; // ascending — matches computeChange's [previous, current] contract
  const change = computeChange(latestTwo);

  const boardState: BoardState = {
    status: "fresh",
    errorCode: "NONE",
    errorTitle: null,
    errorMessage: null,
    errorAction: null,
    current: day0,
    lastSuccessAt: day0.lastUpdatedAt,
    records: latestTwo,
    change,
    waitingForNextDay: false,
    requestedAt: now.toISOString(),
    timeZone: "Asia/Seoul",
    feedUrl: PREVIEW_FEED_URL,
    dailyRecords: latestTwo,
    dailyChange: change?.delta ?? null,
    lastSuccessfulRecord: day0,
  };

  return { id: DAILY_COMPARISON_PREVIEW_ID, boardState, twoDaysAgo: day2 };
}
