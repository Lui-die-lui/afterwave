import { BoardFetchError } from "./errors";
import { kstDateKey } from "./timezone";
import type { NormalizedEarthquake, UsgsFeature, UsgsFeed } from "./types";

/**
 * Deterministic winner selection: largest magnitude; ties broken by most
 * recent occurrence time; remaining ties broken by ascending earthquake id.
 */
export function pickLargestEarthquake(feed: UsgsFeed): UsgsFeature {
  const candidates = feed.features.filter(
    (f): f is UsgsFeature & { properties: { mag: number } } => f.properties.mag !== null
  );

  if (candidates.length === 0) {
    throw new BoardFetchError("SCHEMA_CHANGED", "피드에 유효한 규모(mag) 값을 가진 지진이 없습니다.");
  }

  candidates.sort((a, b) => {
    if (b.properties.mag !== a.properties.mag) return b.properties.mag - a.properties.mag;
    if (b.properties.time !== a.properties.time) return b.properties.time - a.properties.time;
    return a.id.localeCompare(b.id);
  });

  return candidates[0];
}

export function normalizeFeature(
  feature: UsgsFeature,
  feedGeneratedAt: number,
  feedUrl: string,
  requestedAt: Date
): NormalizedEarthquake {
  const [longitude, latitude, depthKm] = feature.geometry.coordinates;
  const mag = feature.properties.mag;
  if (mag === null) {
    throw new BoardFetchError("SCHEMA_CHANGED", "선택된 지진에 규모(mag) 값이 없습니다.");
  }

  return {
    earthquakeId: feature.id,
    magnitude: mag,
    unit: "M",
    place: feature.properties.place ?? "위치 정보 없음",
    depthKm,
    latitude,
    longitude,
    mmiMax: feature.properties.mmi ?? null,
    observedAt: new Date(feature.properties.time).toISOString(),
    sourceUpdatedAt: new Date(feature.properties.updated).toISOString(),
    sourceGeneratedAt: new Date(feedGeneratedAt).toISOString(),
    requestedAt: requestedAt.toISOString(),
    recordDate: kstDateKey(requestedAt),
    sourceUrl: feature.properties.url,
    feedUrl,
  };
}
