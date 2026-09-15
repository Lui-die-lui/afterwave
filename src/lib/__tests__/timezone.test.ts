import { describe, expect, it } from "vitest";
import { addDaysToDateKey, kstDateKey } from "../timezone";

describe("kstDateKey", () => {
  it("converts a UTC instant to its Asia/Seoul calendar date", () => {
    // 2026-01-01 00:30 UTC = 2026-01-01 09:30 KST
    expect(kstDateKey("2026-01-01T00:30:00.000Z")).toBe("2026-01-01");
  });

  it("rolls over to the next KST date for late-UTC instants (KST is UTC+9)", () => {
    // 2025-12-31 15:30 UTC = 2026-01-01 00:30 KST -> already the next KST day
    expect(kstDateKey("2025-12-31T15:30:00.000Z")).toBe("2026-01-01");
  });

  it("stays on the same KST date just before the rollover", () => {
    // 2025-12-31 14:59 UTC = 2025-12-31 23:59 KST
    expect(kstDateKey("2025-12-31T14:59:00.000Z")).toBe("2025-12-31");
  });
});

describe("addDaysToDateKey", () => {
  it("adds one day within a month", () => {
    expect(addDaysToDateKey("2026-09-15", 1)).toBe("2026-09-16");
  });

  it("rolls over month and year boundaries", () => {
    expect(addDaysToDateKey("2025-12-31", 1)).toBe("2026-01-01");
  });
});
