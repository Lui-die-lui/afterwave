import { describe, expect, it } from "vitest";
import { computeChange, roundMagnitude } from "../change";
import type { DailyRecord } from "../types";

function record(recordDate: string, magnitude: number): DailyRecord {
  return {
    earthquakeId: `evt-${recordDate}`,
    magnitude,
    unit: "M",
    place: "test",
    depthKm: 10,
    latitude: 0,
    longitude: 0,
    mmiMax: null,
    observedAt: `${recordDate}T00:00:00.000Z`,
    sourceUpdatedAt: `${recordDate}T00:00:00.000Z`,
    sourceGeneratedAt: `${recordDate}T00:00:00.000Z`,
    requestedAt: `${recordDate}T00:00:00.000Z`,
    recordDate,
    sourceUrl: "https://example.invalid",
    feedUrl: "https://example.invalid",
    firstRecordedAt: `${recordDate}T00:00:00.000Z`,
    lastUpdatedAt: `${recordDate}T00:00:00.000Z`,
  };
}

describe("computeChange", () => {
  it("returns null when fewer than two records exist", () => {
    expect(computeChange([])).toBeNull();
    expect(computeChange([record("2026-09-15", 5.3)])).toBeNull();
  });

  it("computes today - previous from the two most recent records", () => {
    const change = computeChange([record("2026-09-15", 5.8), record("2026-09-16", 6.4)]);
    expect(change).not.toBeNull();
    expect(change?.delta).toBeCloseTo(0.6, 5);
    expect(change?.previousDate).toBe("2026-09-15");
    expect(change?.currentDate).toBe("2026-09-16");
  });

  it("handles a magnitude decrease with a negative delta", () => {
    const change = computeChange([record("2026-09-15", 6.4), record("2026-09-16", 5.8)]);
    expect(change?.delta).toBeCloseTo(-0.6, 5);
  });
});

describe("roundMagnitude", () => {
  it("rounds to one decimal place, matching the display precision", () => {
    expect(roundMagnitude(5.849999)).toBe(5.8);
    expect(roundMagnitude(5.85)).toBe(5.9);
    expect(roundMagnitude(6)).toBe(6);
  });
});
