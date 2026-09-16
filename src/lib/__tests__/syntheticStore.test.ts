import { describe, expect, it, vi } from "vitest";
import type { DailyRecord } from "../types";

// The real `server-only` package throws when imported outside Next.js's own
// build pipeline; stub it so syntheticStore.ts (which pulls in the Supabase
// repository chain) can be unit tested directly under plain Vitest.
vi.mock("server-only", () => ({}));

const { createSyntheticStore } = await import("../syntheticStore");
const { createFakeSyntheticStateRepository } = await import("../supabase/__tests__/fakeSyntheticStateRepository");

function record(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    earthquakeId: "SYN-EVT",
    magnitude: 5.8,
    unit: "M",
    place: "합성 시험 해역",
    depthKm: 12.4,
    latitude: 37.1,
    longitude: 131.6,
    mmiMax: null,
    observedAt: "2026-09-15T00:00:00.000Z",
    sourceUpdatedAt: "2026-09-15T00:05:00.000Z",
    sourceGeneratedAt: "2026-09-15T00:10:00.000Z",
    requestedAt: "2026-09-15T00:10:05.000Z",
    recordDate: "2026-09-15",
    sourceUrl: "https://afterwave.invalid/synthetic-fixtures/SYN-EVT",
    feedUrl: "https://afterwave.invalid/synthetic-fixtures/t04-real-information-board",
    firstRecordedAt: "2026-09-15T00:10:05.000Z",
    lastUpdatedAt: "2026-09-15T00:10:05.000Z",
    ...overrides,
  };
}

describe("createSyntheticStore — records", () => {
  it("starts empty and reports an empty list when nothing has been recorded yet", async () => {
    const store = createSyntheticStore(createFakeSyntheticStateRepository());
    expect(await store.getSyntheticRecords()).toEqual([]);
  });

  it("three upserts on the same record_date update one row instead of inserting three, preserving the original firstRecordedAt", async () => {
    const store = createSyntheticStore(createFakeSyntheticStateRepository());
    await store.upsertSyntheticRecord(record({ magnitude: 5.8, firstRecordedAt: "2026-09-15T00:10:05.000Z" }));
    await store.upsertSyntheticRecord(record({ magnitude: 5.85, firstRecordedAt: "2026-09-15T00:40:05.000Z" }));
    // upsertSyntheticRecord returns the FULL records list (matching the old
    // JsonFileStore-backed behavior), not the single upserted record.
    const third = await store.upsertSyntheticRecord(record({ magnitude: 5.9, firstRecordedAt: "2026-09-15T01:10:05.000Z" }));

    expect(third).toHaveLength(1);
    expect(third[0].magnitude).toBe(5.9);
    expect(third[0].firstRecordedAt).toBe("2026-09-15T00:10:05.000Z"); // kept from the very first insert

    const all = await store.getSyntheticRecords();
    expect(all).toEqual(third);
  });

  it("a success on a new record_date adds exactly one new row, sorted ascending, and leaves the previous date untouched", async () => {
    const store = createSyntheticStore(createFakeSyntheticStateRepository());
    await store.upsertSyntheticRecord(record({ recordDate: "2026-09-15", magnitude: 5.8 }));
    const afterDay2 = await store.upsertSyntheticRecord(record({ recordDate: "2026-09-16", magnitude: 6.4, earthquakeId: "SYN-EVT-D2" }));

    expect(afterDay2.map((r) => r.recordDate)).toEqual(["2026-09-15", "2026-09-16"]);
    expect(afterDay2[0].magnitude).toBe(5.8); // day 1 untouched by day 2's upsert
    expect(afterDay2[1].magnitude).toBe(6.4);

    const all = await store.getSyntheticRecords();
    expect(all).toEqual(afterDay2);
  });
});

describe("createSyntheticStore — meta", () => {
  it("starts at the documented defaults (waiting / NONE) before any scenario runs", async () => {
    const store = createSyntheticStore(createFakeSyntheticStateRepository());
    const meta = await store.getSyntheticMeta();
    expect(meta).toEqual({
      day1Date: null,
      day2Date: null,
      lastScenario: null,
      lastStatus: "waiting",
      lastErrorCode: "NONE",
      lastRunAt: null,
    });
  });

  it("merges a partial patch into the existing meta instead of replacing it wholesale", async () => {
    const store = createSyntheticStore(createFakeSyntheticStateRepository());
    await store.updateSyntheticMeta({ day1Date: "2026-09-15", lastScenario: "D1_A", lastStatus: "fresh", lastErrorCode: "NONE" });
    const meta = await store.updateSyntheticMeta({ day2Date: "2026-09-16", lastScenario: "T04-RECOVER-D2" });

    expect(meta.day1Date).toBe("2026-09-15"); // preserved from the earlier patch
    expect(meta.day2Date).toBe("2026-09-16");
    expect(meta.lastScenario).toBe("T04-RECOVER-D2");
    expect(meta.lastStatus).toBe("fresh"); // untouched by the second patch
  });
});
