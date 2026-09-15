import type { ChangeSummary, DailyRecord } from "./types";

const EPSILON = 1e-9;

/** Rounds to the same 1-decimal precision the UI displays, so re-computation always matches what's on screen. */
export function roundMagnitude(mag: number): number {
  return Math.round((mag + EPSILON) * 10) / 10;
}

/**
 * `change = today - previous`, computed from the two most recent daily
 * records (sorted ascending by recordDate). Returns null if fewer than two
 * real records exist yet — callers must show a "waiting" state, not a
 * fabricated zero.
 */
export function computeChange(latestTwoAscending: DailyRecord[]): ChangeSummary | null {
  if (latestTwoAscending.length < 2) return null;
  const [previous, current] = latestTwoAscending;
  const currentMagnitude = roundMagnitude(current.magnitude);
  const previousMagnitude = roundMagnitude(previous.magnitude);
  return {
    previousDate: previous.recordDate,
    previousMagnitude,
    currentDate: current.recordDate,
    currentMagnitude,
    delta: roundMagnitude(currentMagnitude - previousMagnitude),
  };
}
