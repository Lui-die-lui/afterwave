import type { UsgsFeed } from "../types";

/**
 * Self-authored synthetic fixtures for the Failure Lab.
 *
 * IMPORTANT — provenance note: the assignment references an official asset
 * package (`assets/studio-task-assets/t04-real-information-board/` with a
 * README, `public-contract.json`, `asset-manifest.json`, and package
 * SHA-256 hashes) that ships the canonical fixture bytes. That package was
 * NOT found anywhere in this repository or on this machine when this file
 * was written, so per project rules these values are NOT fabricated to look
 * official — everything below is a clearly-labeled, self-authored stand-in
 * so the required behavior (5 distinct failures + recovery) can still be
 * built and demonstrated. If the real asset package is added later, this
 * file should be replaced with values read directly from it, and its
 * SHA-256 should be verified against `asset-manifest.json`.
 */

const SYNTHETIC_FEED_URL = "https://afterwave.invalid/synthetic-fixtures/t04-real-information-board";

function buildFeed(opts: {
  id: string;
  mag: number;
  mmi?: number | null;
  place: string;
  depthKm: number;
  latitude: number;
  longitude: number;
  timeMs: number;
  updatedMs: number;
  generatedMs: number;
}): UsgsFeed {
  return {
    type: "FeatureCollection",
    metadata: {
      generated: opts.generatedMs,
      url: SYNTHETIC_FEED_URL,
      title: "AFTERWAVE synthetic fixture feed (self-authored, not official asset)",
      status: 200,
      count: 1,
    },
    features: [
      {
        type: "Feature",
        id: opts.id,
        properties: {
          mag: opts.mag,
          mmi: opts.mmi ?? null,
          place: opts.place,
          time: opts.timeMs,
          updated: opts.updatedMs,
          url: `${SYNTHETIC_FEED_URL}/${opts.id}`,
          detail: `${SYNTHETIC_FEED_URL}/${opts.id}.geojson`,
          title: `M ${opts.mag} - ${opts.place}`,
          magType: "mb",
        },
        geometry: {
          type: "Point",
          coordinates: [opts.longitude, opts.latitude, opts.depthKm],
        },
      },
    ],
  };
}

/** D1-A: first synthetic success of the (synthetic) day. */
export function buildSyntheticDay1FeedA(now: Date): UsgsFeed {
  const t = now.getTime();
  return buildFeed({
    id: "SYN-EVT-D1",
    mag: 5.8,
    mmi: 6.1,
    place: "합성 시험 해역, 동해 남부 약 120km 해상 (self-authored fixture)",
    depthKm: 12.4,
    latitude: 37.1,
    longitude: 131.6,
    timeMs: t - 3 * 3_600_000,
    updatedMs: t - 3_600_000,
    generatedMs: t,
  });
}

/** D1-B: same synthetic day, re-checked later — same event, minor revision, must upsert not duplicate. */
export function buildSyntheticDay1FeedB(now: Date): UsgsFeed {
  const t = now.getTime();
  return buildFeed({
    id: "SYN-EVT-D1",
    mag: 5.8,
    mmi: 6.1,
    place: "합성 시험 해역, 동해 남부 약 120km 해상 (self-authored fixture)",
    depthKm: 12.4,
    latitude: 37.1,
    longitude: 131.6,
    timeMs: t - 3 * 3_600_000,
    updatedMs: t - 600_000,
    generatedMs: t,
  });
}

/** T04-RECOVER-D2: recovery on the (simulated) next synthetic day, larger event. */
export function buildSyntheticDay2Feed(now: Date): UsgsFeed {
  const t = now.getTime();
  return buildFeed({
    id: "SYN-EVT-D2",
    mag: 6.4,
    mmi: 7.2,
    place: "합성 시험 해역, 대만 동부 약 80km 해상 (self-authored fixture)",
    depthKm: 24.9,
    latitude: 23.7,
    longitude: 122.4,
    timeMs: t - 2 * 3_600_000,
    updatedMs: t - 1_800_000,
    generatedMs: t,
  });
}

/** Deliberately malformed payload for the schema-drift scenario — fails UsgsFeedSchema on purpose. */
export function buildSchemaDriftPayload(): unknown {
  return {
    type: "FeatureCollection",
    metadata: { generated: Date.now(), url: SYNTHETIC_FEED_URL },
    features: [
      {
        type: "Feature",
        id: "SYN-EVT-SCHEMA-DRIFT",
        properties: {
          // magnitude moved into a nested object and renamed — simulates an upstream contract break
          magnitude_value: { value: "5.9", scale: "Mw" },
          place: "합성 시험: 스키마 변경",
        },
        // geometry removed entirely — another realistic drift
      },
    ],
  };
}
