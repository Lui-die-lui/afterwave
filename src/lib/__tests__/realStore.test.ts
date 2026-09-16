import { describe, expect, it, vi } from "vitest";
import { computeChange } from "../change";
import type { NormalizedEarthquake } from "../types";

// The real `server-only` package throws when imported outside Next.js's own
// build pipeline (which aliases it to a no-op on the server); stub it so
// realStore.ts (which pulls in the Supabase repository chain) can be unit
// tested directly under plain Vitest.
vi.mock("server-only", () => ({}));

const { createRealStore } = await import("../realStore");
const { createFakeRealRecordsRepository } = await import("../supabase/__tests__/fakeRealRecordsRepository");

function normalized(overrides: Partial<NormalizedEarthquake> = {}): NormalizedEarthquake {
  return {
    earthquakeId: "us-a",
    magnitude: 5.0,
    unit: "M",
    place: "somewhere",
    depthKm: 10,
    latitude: 1,
    longitude: 2,
    mmiMax: null,
    observedAt: "2026-09-15T00:00:00.000Z",
    sourceUpdatedAt: "2026-09-15T00:05:00.000Z",
    sourceGeneratedAt: "2026-09-15T00:10:00.000Z",
    requestedAt: "2026-09-15T00:10:05.000Z",
    recordDate: "2026-09-15",
    sourceUrl: "https://earthquake.usgs.gov/earthquakes/eventpage/us-a",
    feedUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    ...overrides,
  };
}

function upsertInput(overrides: Partial<NormalizedEarthquake> = {}) {
  return { normalized: normalized(overrides), rawFeature: { properties: {} }, rawMetadata: {} };
}

describe("createRealStore — same-KST-date upserts", () => {
  it("three successes on the same record_date update one row instead of inserting three", async () => {
    const store = createRealStore(createFakeRealRecordsRepository());

    await store.upsertRealRecord(upsertInput({ magnitude: 4.1 }));
    await store.upsertRealRecord(upsertInput({ magnitude: 4.4 }));
    const third = await store.upsertRealRecord(upsertInput({ magnitude: 4.9 }));

    const all = await store.getAllRealRecords();
    expect(all).toHaveLength(1);
    expect(all[0].magnitude).toBe(4.9);
    expect(all[0]).toEqual(third);
  });

  it("keeps the original firstRecordedAt across repeated updates to the same date", async () => {
    const store = createRealStore(createFakeRealRecordsRepository());

    const first = await store.upsertRealRecord(upsertInput({ magnitude: 4.1 }));
    await new Promise((resolve) => setTimeout(resolve, 5));
    const second = await store.upsertRealRecord(upsertInput({ magnitude: 4.5 }));

    expect(second.firstRecordedAt).toBe(first.firstRecordedAt);
    expect(second.lastUpdatedAt).not.toBe(first.lastUpdatedAt);
  });
});

describe("createRealStore — next-KST-date upserts", () => {
  it("a success on a new record_date adds exactly one new row and leaves the previous date's row untouched", async () => {
    const store = createRealStore(createFakeRealRecordsRepository());

    const day1 = await store.upsertRealRecord(upsertInput({ recordDate: "2026-09-14", magnitude: 4.8 }));
    const day2 = await store.upsertRealRecord(upsertInput({ recordDate: "2026-09-15", magnitude: 5.2 }));

    const all = await store.getAllRealRecords();
    expect(all).toHaveLength(2);
    expect(all.find((r) => r.recordDate === "2026-09-14")).toEqual(day1);
    expect(all.find((r) => r.recordDate === "2026-09-15")).toEqual(day2);
  });

  it("getLatestRealRecords returns the most recent records sorted ascending by recordDate (oldest first)", async () => {
    const store = createRealStore(createFakeRealRecordsRepository());
    await store.upsertRealRecord(upsertInput({ recordDate: "2026-09-13", magnitude: 4.0 }));
    await store.upsertRealRecord(upsertInput({ recordDate: "2026-09-14", magnitude: 4.8 }));
    await store.upsertRealRecord(upsertInput({ recordDate: "2026-09-15", magnitude: 5.2 }));

    const latestTwo = await store.getLatestRealRecords(2);

    expect(latestTwo.map((r) => r.recordDate)).toEqual(["2026-09-14", "2026-09-15"]);
  });

  it("computes the daily change from the two latest records using the same computeChange function the board uses", async () => {
    const store = createRealStore(createFakeRealRecordsRepository());
    await store.upsertRealRecord(upsertInput({ recordDate: "2026-09-14", magnitude: 4.8 }));
    await store.upsertRealRecord(upsertInput({ recordDate: "2026-09-15", magnitude: 5.2 }));

    const latestTwo = await store.getLatestRealRecords(2);
    const change = computeChange(latestTwo);

    expect(change).not.toBeNull();
    expect(change?.previousDate).toBe("2026-09-14");
    expect(change?.currentDate).toBe("2026-09-15");
    expect(change?.delta).toBeCloseTo(0.4, 10);
  });

  it("reports no change (null) and implies no previous marker when only one real record exists — never fabricates a second one", async () => {
    const store = createRealStore(createFakeRealRecordsRepository());
    await store.upsertRealRecord(upsertInput({ recordDate: "2026-09-15", magnitude: 5.2 }));

    const latestTwo = await store.getLatestRealRecords(2);

    expect(latestTwo).toHaveLength(1);
    expect(computeChange(latestTwo)).toBeNull();
  });
});

describe("createRealStore — concurrent upserts to the same date", () => {
  it("never creates duplicate rows when several upserts for the same record_date run concurrently", async () => {
    const store = createRealStore(createFakeRealRecordsRepository());

    await Promise.all([
      store.upsertRealRecord(upsertInput({ magnitude: 4.1 })),
      store.upsertRealRecord(upsertInput({ magnitude: 4.4 })),
      store.upsertRealRecord(upsertInput({ magnitude: 4.9 })),
    ]);

    const all = await store.getAllRealRecords();
    expect(all).toHaveLength(1);
  });
});
