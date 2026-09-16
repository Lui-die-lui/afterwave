import type { SyntheticStateRepository } from "../syntheticStateRepository";

/** In-memory stand-in for `SyntheticStateRepository`, used by tests instead of a live Supabase table. */
export function createFakeSyntheticStateRepository(): SyntheticStateRepository {
  const rows = new Map<string, unknown>();

  return {
    async read<T>(id: string, fallback: T): Promise<T> {
      return rows.has(id) ? (rows.get(id) as T) : fallback;
    },
    async write<T>(id: string, value: T): Promise<T> {
      rows.set(id, value);
      return value;
    },
  };
}
