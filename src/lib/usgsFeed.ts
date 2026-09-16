import { BoardFetchError } from "./errors";
import { UsgsFeedSchema, type UsgsFeed } from "./types";

export const USGS_FEED_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

const TIMEOUT_MS = 8_000;

/** Finds the winning feature's untouched raw JSON (before zod stripped anything) by id, for lossless `raw_payload` storage. Falls back to the validated feature if the raw shape is somehow unreadable — never throws. */
export function extractRawFeature(raw: unknown, featureId: string): unknown {
  if (!raw || typeof raw !== "object") return null;
  const features = (raw as { features?: unknown }).features;
  if (!Array.isArray(features)) return null;
  return features.find((f) => f && typeof f === "object" && (f as { id?: unknown }).id === featureId) ?? null;
}

/** The feed's untouched `metadata` object (may include fields the schema doesn't validate, e.g. `api`). */
export function extractRawMetadata(raw: unknown): unknown {
  if (!raw || typeof raw !== "object") return null;
  return (raw as { metadata?: unknown }).metadata ?? null;
}

export interface UsgsFeedFetch {
  /** Zod-validated/typed feed — unknown keys are stripped by the schema. */
  feed: UsgsFeed;
  /** The exact parsed JSON as USGS sent it, before validation narrowed it — kept so `raw_payload` can preserve fields the schema doesn't declare (e.g. `metadata.api`). */
  raw: unknown;
}

/**
 * Fetches the real USGS feed. Never returns a cached/stale response — the
 * assignment requires live data on every real query, and route handlers that
 * call this always run with `cache: "no-store"`.
 */
export async function fetchUsgsFeed(): Promise<UsgsFeedFetch> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(USGS_FEED_URL, {
      cache: "no-store",
      signal: controller.signal,
      headers: { accept: "application/geo+json, application/json" },
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new BoardFetchError("TIMEOUT", `USGS 응답이 ${TIMEOUT_MS}ms 안에 오지 않았습니다.`);
    }
    throw new BoardFetchError(
      "OFFLINE",
      `USGS 서버에 연결할 수 없습니다: ${err instanceof Error ? err.message : String(err)}`
    );
  } finally {
    clearTimeout(timer);
  }

  if (res.status === 401 || res.status === 403) {
    throw new BoardFetchError("UPSTREAM_AUTH", `USGS 원천이 ${res.status} 응답을 반환했습니다.`);
  }
  if (res.status === 429) {
    throw new BoardFetchError("RATE_LIMITED", "USGS 원천이 429(호출 제한 초과) 응답을 반환했습니다.");
  }
  if (!res.ok) {
    throw new BoardFetchError("UNKNOWN", `USGS 원천이 예상치 못한 상태(${res.status})를 반환했습니다.`);
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    throw new BoardFetchError("SCHEMA_CHANGED", "USGS 응답을 JSON으로 해석할 수 없습니다.");
  }

  const parsed = UsgsFeedSchema.safeParse(json);
  if (!parsed.success) {
    throw new BoardFetchError(
      "SCHEMA_CHANGED",
      `USGS 응답 구조가 예상과 다릅니다: ${parsed.error.issues[0]?.message ?? "알 수 없는 검증 오류"}`
    );
  }

  return { feed: parsed.data, raw: json };
}
