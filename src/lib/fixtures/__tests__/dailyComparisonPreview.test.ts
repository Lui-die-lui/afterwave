import { describe, expect, it } from "vitest";
import { computeChange } from "../../change";
import { addDaysToDateKey, kstDateKey } from "../../timezone";
import { DAILY_COMPARISON_PREVIEW_ID, buildDailyComparisonPreview } from "../dailyComparisonPreview";

const NOW = new Date("2027-03-10T09:00:00.000Z"); // an arbitrary date, deliberately NOT 2026-09-16, to prove nothing is hardcoded

describe("buildDailyComparisonPreview", () => {
  it("shows exactly 3 synthetic records total: today, previous, and two-days-ago", () => {
    const preview = buildDailyComparisonPreview(NOW);
    expect(preview.id).toBe(DAILY_COMPARISON_PREVIEW_ID);
    expect(preview.boardState.dailyRecords).toHaveLength(2);
    expect(preview.twoDaysAgo).toBeTruthy();
  });

  it("uses the exact magnitudes from the spec (5.0 / 4.6 / 5.3)", () => {
    const preview = buildDailyComparisonPreview(NOW);
    expect(preview.boardState.current?.magnitude).toBe(5.0);
    expect(preview.boardState.dailyRecords[0].magnitude).toBe(4.6); // previous
    expect(preview.twoDaysAgo.magnitude).toBe(5.3);
  });

  it("computes the daily change with the SAME computeChange function production uses, not a hardcoded 0.4", () => {
    const preview = buildDailyComparisonPreview(NOW);
    const recomputed = computeChange(preview.boardState.dailyRecords);
    expect(preview.boardState.dailyChange).toBe(recomputed?.delta);
    expect(preview.boardState.dailyChange).toBeCloseTo(0.4, 10);
  });

  it("derives all three record dates from the given clock (Asia/Seoul), never a hardcoded date", () => {
    const preview = buildDailyComparisonPreview(NOW);
    const day0Key = kstDateKey(NOW);
    const day1Key = addDaysToDateKey(day0Key, -1);
    const day2Key = addDaysToDateKey(day0Key, -2);
    expect(preview.boardState.current?.recordDate).toBe(day0Key);
    expect(preview.boardState.dailyRecords[0].recordDate).toBe(day1Key);
    expect(preview.twoDaysAgo.recordDate).toBe(day2Key);
    // Never accidentally produces the literal example date from the spec
    // when `now` is something else entirely.
    expect(day0Key).not.toBe("2026-09-16");
  });

  it("never gives a real, clickable USGS source URL — sourceUrl is empty so the UI must hide/disable the link", () => {
    const preview = buildDailyComparisonPreview(NOW);
    expect(preview.boardState.current?.sourceUrl).toBe("");
    expect(preview.twoDaysAgo.sourceUrl).toBe("");
  });

  it("keeps the two-days-ago record OUT of records/dailyRecords so it can never be mistaken for one of the two real-record slots", () => {
    const preview = buildDailyComparisonPreview(NOW);
    const ids = preview.boardState.dailyRecords.map((r) => r.earthquakeId);
    expect(ids).not.toContain(preview.twoDaysAgo.earthquakeId);
  });

  it("is a pure function of `now` — two calls with the same instant produce the same dates and values", () => {
    const a = buildDailyComparisonPreview(NOW);
    const b = buildDailyComparisonPreview(NOW);
    expect(a.boardState.dailyRecords).toEqual(b.boardState.dailyRecords);
    expect(a.twoDaysAgo).toEqual(b.twoDaysAgo);
  });
});
