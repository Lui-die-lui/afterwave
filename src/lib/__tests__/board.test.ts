import { beforeEach, describe, expect, it, vi } from "vitest";
import { BoardFetchError } from "../errors";
import type { DailyRecord, UsgsFeature, UsgsFeed } from "../types";

const upsertRealRecord = vi.fn();
const getLatestRealRecords = vi.fn();
const getAllRealRecords = vi.fn();
vi.mock("../realStore", () => ({
  upsertRealRecord: (...args: unknown[]) => upsertRealRecord(...args),
  getLatestRealRecords: (...args: unknown[]) => getLatestRealRecords(...args),
  getAllRealRecords: (...args: unknown[]) => getAllRealRecords(...args),
}));

const fetchUsgsFeed = vi.fn();
vi.mock("../usgsFeed", async () => {
  const actual = await vi.importActual<typeof import("../usgsFeed")>("../usgsFeed");
  return { ...actual, fetchUsgsFeed: (...args: unknown[]) => fetchUsgsFeed(...args) };
});

const { getLatestBoardState } = await import("../board");

function lastGoodRecord(overrides: Partial<DailyRecord> = {}): DailyRecord {
  return {
    earthquakeId: "us-last-good",
    magnitude: 4.8,
    unit: "M",
    place: "last good place",
    depthKm: 10,
    latitude: 1,
    longitude: 2,
    mmiMax: null,
    observedAt: "2026-09-14T00:00:00.000Z",
    sourceUpdatedAt: "2026-09-14T00:05:00.000Z",
    sourceGeneratedAt: "2026-09-14T00:10:00.000Z",
    requestedAt: "2026-09-14T00:10:05.000Z",
    recordDate: "2026-09-14",
    sourceUrl: "https://earthquake.usgs.gov/earthquakes/eventpage/us-last-good",
    feedUrl: "https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/all_day.geojson",
    firstRecordedAt: "2026-09-14T00:10:05.000Z",
    lastUpdatedAt: "2026-09-14T00:10:05.000Z",
    ...overrides,
  };
}

function validUsgsFeature(overrides: Partial<UsgsFeature["properties"]> = {}): UsgsFeature {
  return {
    type: "Feature",
    id: "us-fresh-1",
    properties: {
      mag: 5.2,
      place: "fresh place",
      time: 1_700_000_000_000,
      updated: 1_700_000_100_000,
      url: "https://earthquake.usgs.gov/earthquakes/eventpage/us-fresh-1",
      ...overrides,
    },
    geometry: { type: "Point", coordinates: [130, 35, 12] },
  };
}

function validUsgsFeed(): UsgsFeed {
  return {
    type: "FeatureCollection",
    metadata: { generated: 1_700_000_200_000, url: "https://example.invalid/feed" },
    features: [validUsgsFeature()],
  };
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("getLatestBoardState — USGS failure", () => {
  it("never calls the storage write and falls back to the last good record as stale", async () => {
    fetchUsgsFeed.mockRejectedValue(new BoardFetchError("TIMEOUT", "boom"));
    const lastGood = lastGoodRecord();
    getLatestRealRecords.mockResolvedValue([lastGood]);

    const state = await getLatestBoardState();

    expect(upsertRealRecord).not.toHaveBeenCalled();
    expect(state.status).toBe("stale");
    expect(state.errorCode).toBe("TIMEOUT");
    expect(state.current).toEqual(lastGood);
    expect(state.lastSuccessfulRecord).toEqual(lastGood);
    expect(state.waitingForNextDay).toBe(true);
  });

  it("reports error (not stale) with no current value when there is no prior real record at all", async () => {
    fetchUsgsFeed.mockRejectedValue(new BoardFetchError("OFFLINE", "no net"));
    getLatestRealRecords.mockResolvedValue([]);

    const state = await getLatestBoardState();

    expect(state.status).toBe("error");
    expect(state.errorCode).toBe("OFFLINE");
    expect(state.current).toBeNull();
    expect(state.dailyRecords).toEqual([]);
  });

  it("reports a distinct STORAGE_ERROR (not the USGS error code) when even the fallback read fails, and never fabricates a value", async () => {
    fetchUsgsFeed.mockRejectedValue(new BoardFetchError("OFFLINE", "no net"));
    getLatestRealRecords.mockRejectedValue(new Error("db unreachable"));

    const state = await getLatestBoardState();

    expect(state.status).toBe("error");
    expect(state.errorCode).toBe("STORAGE_ERROR");
    expect(state.current).toBeNull();
    expect(state.records).toEqual([]);
  });
});

describe("getLatestBoardState — storage failure after a successful USGS fetch", () => {
  it("reports STORAGE_ERROR and falls back to the last good record instead of showing the unsaved fresh value as fresh", async () => {
    fetchUsgsFeed.mockResolvedValue({ feed: validUsgsFeed(), raw: validUsgsFeed() });
    upsertRealRecord.mockRejectedValue(new Error("db down"));
    const lastGood = lastGoodRecord();
    getLatestRealRecords.mockResolvedValue([lastGood]);

    const state = await getLatestBoardState();

    expect(state.status).toBe("stale");
    expect(state.errorCode).toBe("STORAGE_ERROR");
    expect(state.current).toEqual(lastGood);
    expect(state.current?.earthquakeId).not.toBe("us-fresh-1");
  });
});

describe("getLatestBoardState — full success", () => {
  it("marks fresh and keeps the additive dailyRecords/dailyChange/lastSuccessfulRecord fields consistent with records/change/current", async () => {
    fetchUsgsFeed.mockResolvedValue({ feed: validUsgsFeed(), raw: validUsgsFeed() });
    const written = lastGoodRecord({ recordDate: "2026-09-15", earthquakeId: "us-fresh-1", magnitude: 5.2 });
    upsertRealRecord.mockResolvedValue(written);
    const previousDay = lastGoodRecord({ recordDate: "2026-09-14", magnitude: 4.8 });
    getLatestRealRecords.mockResolvedValue([previousDay, written]);

    const state = await getLatestBoardState();

    expect(state.status).toBe("fresh");
    expect(state.errorCode).toBe("NONE");
    expect(upsertRealRecord).toHaveBeenCalledTimes(1);
    expect(state.records).toEqual(state.dailyRecords);
    expect(state.dailyChange).toBe(state.change?.delta);
    expect(state.lastSuccessfulRecord).toEqual(state.current);
    expect(state.waitingForNextDay).toBe(false);
  });

  it("only ever touches the real store's write path once per call — the client cannot influence which row gets written", async () => {
    fetchUsgsFeed.mockResolvedValue({ feed: validUsgsFeed(), raw: validUsgsFeed() });
    upsertRealRecord.mockResolvedValue(lastGoodRecord({ recordDate: "2026-09-15" }));
    getLatestRealRecords.mockResolvedValue([lastGoodRecord({ recordDate: "2026-09-15" })]);

    await getLatestBoardState();

    const [upsertArg] = upsertRealRecord.mock.calls[0];
    expect(upsertArg.normalized.magnitude).toBe(5.2); // exactly what USGS returned, not a caller-supplied value
    expect(upsertArg.normalized.recordDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
