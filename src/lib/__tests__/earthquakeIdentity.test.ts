import { describe, expect, it } from "vitest";
import { isSameEarthquake } from "../earthquakeIdentity";

const base = { earthquakeId: "us7000abcd", latitude: -6.63, longitude: 130.34, observedAt: "2026-09-15T06:07:52.000Z" };

describe("isSameEarthquake", () => {
  it("matches on earthquakeId even if other fields drift slightly (revised magnitude, etc.)", () => {
    expect(isSameEarthquake(base, { ...base, latitude: -6.6301 })).toBe(true);
  });

  it("does not match a different earthquakeId even at the same coordinates", () => {
    expect(isSameEarthquake(base, { ...base, earthquakeId: "us7000zzzz" })).toBe(false);
  });

  it("falls back to coordinates + observed time when an id is missing", () => {
    const a = { ...base, earthquakeId: "" };
    const b = { ...base, earthquakeId: "" };
    expect(isSameEarthquake(a, b)).toBe(true);
  });

  it("treats missing-id records with different coordinates as different earthquakes", () => {
    const a = { ...base, earthquakeId: "" };
    const b = { ...base, earthquakeId: "", longitude: 140.0 };
    expect(isSameEarthquake(a, b)).toBe(false);
  });
});
