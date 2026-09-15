import { JsonFileStore } from "./jsonFileStore";
import type { BoardStatus, DailyRecord, ErrorCode } from "./types";

export interface SyntheticMeta {
  day1Date: string | null;
  day2Date: string | null;
  lastScenario: string | null;
  lastStatus: BoardStatus;
  lastErrorCode: ErrorCode;
  lastRunAt: string | null;
}

const DEFAULT_META: SyntheticMeta = {
  day1Date: null,
  day2Date: null,
  lastScenario: null,
  lastStatus: "waiting",
  lastErrorCode: "NONE",
  lastRunAt: null,
};

const recordsStore = new JsonFileStore<DailyRecord[]>("synthetic/records.json", []);
const metaStore = new JsonFileStore<SyntheticMeta>("synthetic/meta.json", DEFAULT_META);

export async function getSyntheticRecords(): Promise<DailyRecord[]> {
  const records = await recordsStore.read();
  return [...records].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
}

export async function upsertSyntheticRecord(record: DailyRecord): Promise<DailyRecord[]> {
  return recordsStore.update((records) => {
    const idx = records.findIndex((r) => r.recordDate === record.recordDate);
    if (idx >= 0) {
      const next = [...records];
      next[idx] = { ...record, firstRecordedAt: records[idx].firstRecordedAt };
      return next;
    }
    return [...records, record].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
  });
}

export async function getSyntheticMeta(): Promise<SyntheticMeta> {
  return metaStore.read();
}

export async function updateSyntheticMeta(patch: Partial<SyntheticMeta>): Promise<SyntheticMeta> {
  return metaStore.update((current) => ({ ...current, ...patch }));
}
