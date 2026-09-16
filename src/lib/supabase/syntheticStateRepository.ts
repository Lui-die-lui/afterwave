import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseAdmin } from "./supabaseAdmin";

const TABLE = "afterwave_synthetic_state";

/**
 * Thrown for any Supabase-side failure reading/writing synthetic state.
 * Deliberately its own class (not `StorageError` from
 * `realRecordsRepository.ts`) — the synthetic store must never import
 * anything from the real-records module, so the two failure domains stay
 * independent all the way down to their error types.
 */
export class SyntheticStorageError extends Error {
  constructor(message: string, readonly cause?: unknown) {
    super(message);
    this.name = "SyntheticStorageError";
  }
}

interface StateRow {
  id: string;
  data: unknown;
}

/**
 * Tiny key/value table backing the Failure Lab's synthetic store — see
 * `supabase/migrations/0002_create_afterwave_synthetic_state.sql`.
 * Completely separate table from `afterwave_daily_records`; never touched by
 * `realStore.ts` / `realRecordsRepository.ts`, and vice versa.
 */
export function createSyntheticStateRepository(client?: SupabaseClient) {
  const resolveClient = () => client ?? getSupabaseAdmin();

  return {
    async read<T>(id: string, fallback: T): Promise<T> {
      const { data, error } = await resolveClient().from(TABLE).select("data").eq("id", id).maybeSingle();
      if (error) {
        throw new SyntheticStorageError(`합성 상태(${id}) 조회에 실패했습니다.`, error);
      }
      return data ? ((data as StateRow).data as T) : fallback;
    },

    async write<T>(id: string, value: T): Promise<T> {
      const { error } = await resolveClient()
        .from(TABLE)
        .upsert({ id, data: value, updated_at: new Date().toISOString() }, { onConflict: "id" });
      if (error) {
        throw new SyntheticStorageError(`합성 상태(${id}) 저장에 실패했습니다.`, error);
      }
      return value;
    },
  };
}

export type SyntheticStateRepository = ReturnType<typeof createSyntheticStateRepository>;
