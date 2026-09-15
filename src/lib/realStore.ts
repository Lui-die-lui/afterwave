import { JsonFileStore } from "./jsonFileStore";
import type { DailyRecord, NormalizedEarthquake } from "./types";

const store = new JsonFileStore<DailyRecord[]>("real/records.json", []);

/**
 * Upserts by `recordDate` (Asia/Seoul day key): a repeat success on the same
 * KST day updates the existing row in place; a new KST day appends a new row.
 * This is the ONLY writer of real daily records — synthetic replays never
 * call this.
 */
export async function upsertRealRecord(value: NormalizedEarthquake): Promise<DailyRecord[]> {
  return store.update((records) => {
    const now = value.requestedAt;
    const existingIdx = records.findIndex((r) => r.recordDate === value.recordDate);
    if (existingIdx >= 0) {
      const existing = records[existingIdx];
      const updated: DailyRecord = { ...value, firstRecordedAt: existing.firstRecordedAt, lastUpdatedAt: now };
      const next = [...records];
      next[existingIdx] = updated;
      return next;
    }
    const created: DailyRecord = { ...value, firstRecordedAt: now, lastUpdatedAt: now };
    return [...records, created].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  });
}

export async function getAllRealRecords(): Promise<DailyRecord[]> {
  const records = await store.read();
  return [...records].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
}

export async function getLatestRealRecords(count = 2): Promise<DailyRecord[]> {
  const records = await getAllRealRecords();
  return records.slice(-count);
}
