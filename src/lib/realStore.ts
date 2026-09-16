import { createSupabaseRealRecordsRepository, type RealRecordsRepository, type RealUpsertInput } from "./supabase/realRecordsRepository";
import type { DailyRecord } from "./types";

/**
 * Thin, storage-agnostic wrapper around a `RealRecordsRepository` — the
 * ONLY writer of real (non-synthetic) daily records; synthetic replays
 * never call this. Takes the repository as a parameter so tests can inject
 * an in-memory fake instead of talking to Supabase (see
 * `supabase/__tests__/fakeRealRecordsRepository.ts`).
 */
export function createRealStore(repository: RealRecordsRepository) {
  return {
    upsertRealRecord: (input: RealUpsertInput): Promise<DailyRecord> => repository.upsertToday(input),
    getLatestRealRecords: (count = 2): Promise<DailyRecord[]> => repository.getLatest(count),
    getAllRealRecords: (): Promise<DailyRecord[]> => repository.getAll(),
  };
}

// Lazy default store: constructing the Supabase repository only requires
// env vars to exist once a request actually calls one of these, not at
// module import time (see supabaseAdmin.ts).
let defaultStore: ReturnType<typeof createRealStore> | null = null;
function getDefaultStore() {
  if (!defaultStore) defaultStore = createRealStore(createSupabaseRealRecordsRepository());
  return defaultStore;
}

export function upsertRealRecord(input: RealUpsertInput): Promise<DailyRecord> {
  return getDefaultStore().upsertRealRecord(input);
}

export function getLatestRealRecords(count = 2): Promise<DailyRecord[]> {
  return getDefaultStore().getLatestRealRecords(count);
}

export function getAllRealRecords(): Promise<DailyRecord[]> {
  return getDefaultStore().getAllRealRecords();
}
