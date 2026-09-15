import { computeChange } from "./change";
import { ERROR_COPY } from "./errors";
import { BoardFetchError } from "./errors";
import { normalizeFeature, pickLargestEarthquake } from "./normalize";
import { getAllRealRecords, upsertRealRecord } from "./realStore";
import type { BoardState } from "./types";
import { USGS_FEED_URL, fetchUsgsFeed } from "./usgsFeed";

/**
 * Runs one real query against USGS, updates the real daily-record store on
 * success, and always returns a fully-formed BoardState — on failure this
 * falls back to the last good real record (marked `stale`) rather than
 * ever deleting it or showing a placeholder value.
 */
export async function getLatestBoardState(): Promise<BoardState> {
  const requestedAt = new Date();

  try {
    const feed = await fetchUsgsFeed();
    const winner = pickLargestEarthquake(feed);
    const normalized = normalizeFeature(winner, feed.metadata.generated, USGS_FEED_URL, requestedAt);

    const records = await upsertRealRecord(normalized);
    const latestTwo = records.slice(-2);
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
      waitingForNextDay: records.length < 2,
      requestedAt: requestedAt.toISOString(),
      timeZone: "Asia/Seoul",
      feedUrl: USGS_FEED_URL,
    };
  } catch (err) {
    const code = err instanceof BoardFetchError ? err.code : "UNKNOWN";
    const copy = ERROR_COPY[code];

    const records = await getAllRealRecords();
    const latestTwo = records.slice(-2);
    const lastGood = records[records.length - 1] ?? null;

    return {
      status: lastGood ? "stale" : "error",
      errorCode: code,
      errorTitle: copy.title,
      errorMessage: copy.message,
      errorAction: copy.action,
      current: lastGood,
      lastSuccessAt: lastGood?.lastUpdatedAt ?? null,
      records: latestTwo,
      change: computeChange(latestTwo),
      waitingForNextDay: records.length < 2,
      requestedAt: requestedAt.toISOString(),
      timeZone: "Asia/Seoul",
      feedUrl: USGS_FEED_URL,
    };
  }
}
