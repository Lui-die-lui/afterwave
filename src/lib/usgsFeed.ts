import { BoardFetchError } from "./errors";
import { UsgsFeedSchema, type UsgsFeed } from "./types";

export const USGS_FEED_URL =
  "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson";

const TIMEOUT_MS = 8_000;

/**
 * Fetches the real USGS feed. Never returns a cached/stale response — the
 * assignment requires live data on every real query, and route handlers that
 * call this always run with `cache: "no-store"`.
 */
export async function fetchUsgsFeed(): Promise<UsgsFeed> {
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

  return parsed.data;
}
