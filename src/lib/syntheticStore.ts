import { createSyntheticStateRepository, type SyntheticStateRepository } from "./supabase/syntheticStateRepository";
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

/**
 * Storage-agnostic wrapper around a `SyntheticStateRepository` — the ONLY
 * place the Failure Lab's records/meta blobs are read or written. Takes the
 * repository as a parameter so tests can inject an in-memory fake instead of
 * talking to Supabase (see `supabase/__tests__/fakeSyntheticStateRepository.ts`).
 */
export function createSyntheticStore(repository: SyntheticStateRepository) {
  return {
    async getSyntheticRecords(): Promise<DailyRecord[]> {
      const records = await repository.read<DailyRecord[]>("records", []);
      return [...records].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
    },

    async upsertSyntheticRecord(record: DailyRecord): Promise<DailyRecord[]> {
      const records = await repository.read<DailyRecord[]>("records", []);
      const idx = records.findIndex((r) => r.recordDate === record.recordDate);
      const next =
        idx >= 0
          ? records.map((r, i) => (i === idx ? { ...record, firstRecordedAt: r.firstRecordedAt } : r))
          : [...records, record].sort((a, b) => a.recordDate.localeCompare(b.recordDate));
      await repository.write("records", next);
      return next;
    },

    async getSyntheticMeta(): Promise<SyntheticMeta> {
      return repository.read<SyntheticMeta>("meta", DEFAULT_META);
    },

    async updateSyntheticMeta(patch: Partial<SyntheticMeta>): Promise<SyntheticMeta> {
      const current = await repository.read<SyntheticMeta>("meta", DEFAULT_META);
      const next = { ...current, ...patch };
      await repository.write("meta", next);
      return next;
    },
  };
}

// Lazy default store: constructing the Supabase repository only requires env
// vars to exist once a request actually calls one of these, not at module
// import time (see supabaseAdmin.ts).
let defaultStore: ReturnType<typeof createSyntheticStore> | null = null;
function getDefaultStore() {
  if (!defaultStore) defaultStore = createSyntheticStore(createSyntheticStateRepository());
  return defaultStore;
}

export function getSyntheticRecords(): Promise<DailyRecord[]> {
  return getDefaultStore().getSyntheticRecords();
}

export function upsertSyntheticRecord(record: DailyRecord): Promise<DailyRecord[]> {
  return getDefaultStore().upsertSyntheticRecord(record);
}

export function getSyntheticMeta(): Promise<SyntheticMeta> {
  return getDefaultStore().getSyntheticMeta();
}

export function updateSyntheticMeta(patch: Partial<SyntheticMeta>): Promise<SyntheticMeta> {
  return getDefaultStore().updateSyntheticMeta(patch);
}
