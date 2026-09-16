import { computeChange } from "./change";
import { BoardFetchError, ERROR_COPY } from "./errors";
import { normalizeFeature, pickLargestEarthquake } from "./normalize";
import { getLatestRealRecords, upsertRealRecord } from "./realStore";
import type { BoardState, DailyRecord, ErrorCode, NormalizedEarthquake } from "./types";
import { USGS_FEED_URL, extractRawFeature, extractRawMetadata, fetchUsgsFeed } from "./usgsFeed";

interface FailureCopy {
  code: ErrorCode;
  title: string;
  message: string;
  action: string;
}

function usgsFailureCopy(err: unknown): FailureCopy {
  const code = err instanceof BoardFetchError ? err.code : "UNKNOWN";
  const copy = ERROR_COPY[code];
  return { code, ...copy };
}

/**
 * Builds the `stale` (last-good-value) or `error` (never-succeeded) state
 * from whatever the real-records storage currently holds. Used both when
 * USGS itself failed and when USGS succeeded but the Supabase write failed
 * — the two are told apart only by which `FailureCopy` the caller passes
 * in, never by silently reusing the wrong one.
 *
 * If the storage READ (not just the earlier write) also fails, that's
 * reported as its own honest `error` state instead of pretending there is
 * no last-good value — "empty" and "couldn't check" are different facts.
 */
async function fallbackState(requestedAt: Date, failure: FailureCopy): Promise<BoardState> {
  let latestTwo: DailyRecord[];
  try {
    latestTwo = await getLatestRealRecords(2);
  } catch {
    return {
      status: "error",
      errorCode: "STORAGE_ERROR",
      errorTitle: "저장소 조회 실패",
      errorMessage:
        "실제 일별 기록 저장소에 연결할 수 없어 마지막 정상값을 확인하지 못했습니다. 값을 임의로 만들어내지 않습니다.",
      errorAction: "잠시 후 다시 시도해주세요.",
      current: null,
      lastSuccessAt: null,
      records: [],
      change: null,
      waitingForNextDay: true,
      requestedAt: requestedAt.toISOString(),
      timeZone: "Asia/Seoul",
      feedUrl: USGS_FEED_URL,
      dailyRecords: [],
      dailyChange: null,
      lastSuccessfulRecord: null,
    };
  }

  const lastGood = latestTwo[latestTwo.length - 1] ?? null;
  const change = computeChange(latestTwo);

  return {
    status: lastGood ? "stale" : "error",
    errorCode: failure.code,
    errorTitle: failure.title,
    errorMessage: failure.message,
    errorAction: failure.action,
    current: lastGood,
    lastSuccessAt: lastGood?.lastUpdatedAt ?? null,
    records: latestTwo,
    change,
    waitingForNextDay: latestTwo.length < 2,
    requestedAt: requestedAt.toISOString(),
    timeZone: "Asia/Seoul",
    feedUrl: USGS_FEED_URL,
    dailyRecords: latestTwo,
    dailyChange: change?.delta ?? null,
    lastSuccessfulRecord: lastGood,
  };
}

/**
 * Runs one real query against USGS, persists it to the real (Supabase)
 * daily-record store on success, and always returns a fully-formed
 * BoardState — on ANY failure (USGS itself, or the Supabase write/read
 * after a successful USGS fetch) this falls back to the last good stored
 * record (marked `stale`) rather than ever deleting it or showing a
 * fabricated value. A USGS success is never reported as `fresh` unless it
 * was actually confirmed durable in storage first.
 */
export async function getLatestBoardState(): Promise<BoardState> {
  const requestedAt = new Date();

  // Step 1 — live USGS fetch + runtime-validated normalization. Pure
  // network/parsing; storage is not involved yet.
  let normalized: NormalizedEarthquake;
  let rawFeature: unknown;
  let rawMetadata: unknown;
  try {
    const { feed, raw } = await fetchUsgsFeed();
    const winner = pickLargestEarthquake(feed);
    normalized = normalizeFeature(winner, feed.metadata.generated, USGS_FEED_URL, requestedAt);
    rawFeature = extractRawFeature(raw, winner.id) ?? winner;
    rawMetadata = extractRawMetadata(raw) ?? feed.metadata;
  } catch (err) {
    return fallbackState(requestedAt, usgsFailureCopy(err));
  }

  // Step 2 — persist to Supabase (the only place a real daily row is ever
  // written). A failure HERE is a storage problem, not a USGS problem —
  // even though the live fetch just succeeded, we never show it as `fresh`
  // without a confirmed durable write, so the daily-record invariants
  // (one row per KST date, never fabricated) stay airtight.
  let written: DailyRecord;
  try {
    written = await upsertRealRecord({ normalized, rawFeature, rawMetadata });
  } catch {
    const copy = ERROR_COPY.STORAGE_ERROR;
    return fallbackState(requestedAt, { code: "STORAGE_ERROR", ...copy });
  }

  // Step 3 — read back the latest two rows for `records`/`change`. If this
  // specific read fails right after a confirmed-successful write, we still
  // honestly know `written` is durable — show it as the sole record rather
  // than escalating to an error state we don't actually have.
  let latestTwo: DailyRecord[];
  try {
    latestTwo = await getLatestRealRecords(2);
  } catch {
    latestTwo = [written];
  }

  const change = computeChange(latestTwo);

  return {
    status: "fresh",
    errorCode: "NONE",
    errorTitle: null,
    errorMessage: null,
    errorAction: null,
    current: normalized,
    lastSuccessAt: normalized.requestedAt,
    records: latestTwo,
    change,
    waitingForNextDay: latestTwo.length < 2,
    requestedAt: requestedAt.toISOString(),
    timeZone: "Asia/Seoul",
    feedUrl: USGS_FEED_URL,
    dailyRecords: latestTwo,
    dailyChange: change?.delta ?? null,
    lastSuccessfulRecord: normalized,
  };
}
