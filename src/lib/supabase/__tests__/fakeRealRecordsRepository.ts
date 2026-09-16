import type { DailyRecord } from "../../types";
import type { RealRecordsRepository, RealUpsertInput } from "../realRecordsRepository";

/**
 * In-memory stand-in for `RealRecordsRepository`, used by tests instead of a
 * live Supabase table. Reproduces the same upsert-by-`record_date` contract
 * the real Postgres `ON CONFLICT (record_date) DO UPDATE` gives us:
 * same-date calls update that one row in place (preserving `firstRecordedAt`
 * / created_at), a new date appends exactly one new row, and — because
 * JS is single-threaded and each mutation here is synchronous — concurrent
 * `Promise.all` upserts can never race into duplicate rows, the same
 * guarantee the database's own atomic upsert provides.
 */
export function createFakeRealRecordsRepository(seed: DailyRecord[] = []): RealRecordsRepository {
  const rows = new Map<string, DailyRecord>(seed.map((r) => [r.recordDate, r]));

  function toDailyRecord(input: RealUpsertInput, firstRecordedAt: string, lastUpdatedAt: string): DailyRecord {
    const { normalized, rawFeature } = input;
    const mmi =
      rawFeature && typeof rawFeature === "object" && "properties" in rawFeature
        ? ((rawFeature as { properties?: { mmi?: number | null } }).properties?.mmi ?? null)
        : null;
    return {
      ...normalized,
      mmiMax: mmi,
      firstRecordedAt,
      lastUpdatedAt,
    };
  }

  return {
    async upsertToday(input) {
      const key = input.normalized.recordDate;
      const existing = rows.get(key);
      const now = new Date().toISOString();
      const record = toDailyRecord(input, existing?.firstRecordedAt ?? now, now);
      rows.set(key, record);
      return record;
    },

    async getLatest(count) {
      return [...rows.values()].sort((a, b) => a.recordDate.localeCompare(b.recordDate)).slice(-count);
    },

    async getAll() {
      return [...rows.values()].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
    },
  };
}
