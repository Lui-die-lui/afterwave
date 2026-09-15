import { describe, expect, it } from "vitest";
import { BoardFetchError } from "../errors";
import { normalizeFeature, pickLargestEarthquake } from "../normalize";
import type { UsgsFeature, UsgsFeed } from "../types";

function feature(overrides: Partial<UsgsFeature["properties"]> & { id: string }): UsgsFeature {
  const { id, ...properties } = overrides;
  return {
    type: "Feature",
    id,
    properties: {
      mag: 5,
      place: "somewhere",
      time: 1_000,
      updated: 2_000,
      url: "https://earthquake.usgs.gov/earthquakes/eventpage/test",
      ...properties,
    },
    geometry: { type: "Point", coordinates: [130, 35, 10] },
  };
}

function feed(features: UsgsFeature[]): UsgsFeed {
  return {
    type: "FeatureCollection",
    metadata: { generated: 5_000, url: "https://example.invalid/feed" },
    features,
  };
}

describe("pickLargestEarthquake", () => {
  it("picks the highest magnitude", () => {
    const winner = pickLargestEarthquake(feed([feature({ id: "a", mag: 4.1 }), feature({ id: "b", mag: 5.9 })]));
    expect(winner.id).toBe("b");
  });

  it("ignores events with a null magnitude", () => {
    const winner = pickLargestEarthquake(feed([feature({ id: "a", mag: null }), feature({ id: "b", mag: 4.1 })]));
    expect(winner.id).toBe("b");
  });

  it("breaks a magnitude tie by the most recent occurrence time", () => {
    const winner = pickLargestEarthquake(
      feed([feature({ id: "a", mag: 5, time: 1_000 }), feature({ id: "b", mag: 5, time: 2_000 })])
    );
    expect(winner.id).toBe("b");
  });

  it("breaks a remaining tie by ascending earthquake id", () => {
    const winner = pickLargestEarthquake(
      feed([feature({ id: "z", mag: 5, time: 1_000 }), feature({ id: "a", mag: 5, time: 1_000 })])
    );
    expect(winner.id).toBe("a");
  });

  it("throws SCHEMA_CHANGED when no feature has a usable magnitude", () => {
    expect(() => pickLargestEarthquake(feed([feature({ id: "a", mag: null })]))).toThrowError(BoardFetchError);
  });
});

describe("normalizeFeature", () => {
  it("maps a feature into the on-screen/stored shape with the given requestedAt as recordDate basis", () => {
    const f = feature({ id: "evt-1", mag: 5.3, place: "Test Place", time: 1_700_000_000_000, updated: 1_700_000_100_000 });
    const requestedAt = new Date("2026-09-15T13:44:00.000Z");
    const normalized = normalizeFeature(f, 1_700_000_200_000, "https://feed.invalid", requestedAt);

    expect(normalized.earthquakeId).toBe("evt-1");
    expect(normalized.magnitude).toBe(5.3);
    expect(normalized.unit).toBe("M");
    expect(normalized.place).toBe("Test Place");
    expect(normalized.depthKm).toBe(10);
    expect(normalized.observedAt).toBe(new Date(1_700_000_000_000).toISOString());
    expect(normalized.sourceUpdatedAt).toBe(new Date(1_700_000_100_000).toISOString());
    expect(normalized.sourceGeneratedAt).toBe(new Date(1_700_000_200_000).toISOString());
    expect(normalized.requestedAt).toBe(requestedAt.toISOString());
    expect(normalized.recordDate).toBe("2026-09-15");
  });
});
