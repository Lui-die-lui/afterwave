import { describe, expect, it } from "vitest";
import { getMagnitudeGuide, getMmiSummary, getRippleSizeTier } from "../magnitudeGuide";

describe("getMagnitudeGuide boundary values", () => {
  const cases: [number, string, number][] = [
    [2.4, "매우 작은 규모", 1],
    [2.5, "작은 규모", 2],
    [3.9, "작은 규모", 2],
    [4.0, "가벼운 규모", 3],
    [4.9, "가벼운 규모", 3],
    [5.0, "중간 규모", 4],
    [5.9, "중간 규모", 4],
    [6.0, "강한 규모", 5],
    [6.9, "강한 규모", 5],
    [7.0, "매우 큰 규모", 6],
    [7.9, "매우 큰 규모", 6],
    [8.0, "거대 지진", 7],
  ];

  it.each(cases)("M %s -> %s (ladder %s)", (mag, level, ladderIndex) => {
    const guide = getMagnitudeGuide(mag);
    expect(guide.level).toBe(level);
    expect(guide.ladderIndex).toBe(ladderIndex);
    expect(guide.ladderTotal).toBe(7);
  });

  it("handles far below and far above the defined range without throwing", () => {
    expect(getMagnitudeGuide(-1).level).toBe("매우 작은 규모");
    expect(getMagnitudeGuide(9.9).level).toBe("거대 지진");
  });
});

describe("getRippleSizeTier", () => {
  it("uses the coarser 4-tier scale for wave sizing", () => {
    expect(getRippleSizeTier(1)).toBe(1);
    expect(getRippleSizeTier(2.9)).toBe(1);
    expect(getRippleSizeTier(3)).toBe(2);
    expect(getRippleSizeTier(4.9)).toBe(2);
    expect(getRippleSizeTier(5)).toBe(3);
    expect(getRippleSizeTier(6.9)).toBe(3);
    expect(getRippleSizeTier(7)).toBe(4);
    expect(getRippleSizeTier(9)).toBe(4);
  });
});

describe("getMmiSummary", () => {
  it("reports unavailable when mmi is null, without estimating from magnitude", () => {
    const summary = getMmiSummary(null);
    expect(summary.available).toBe(false);
    expect(summary.text).toContain("아직 제공되지 않았습니다");
  });

  it("formats a real mmi value as a roman numeral + short descriptor", () => {
    expect(getMmiSummary(6.2).text).toBe("MMI VI · 강함");
    expect(getMmiSummary(1).text).toBe("MMI I · 감지 안 됨");
  });
});
