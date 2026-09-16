import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseEnv } from "./env";

/**
 * Server-only Supabase client using the secret (service role) key — never
 * import this from a Client Component or anything that ends up in the
 * browser bundle. The `server-only` import above makes that a build error,
 * not just a convention. Lazily constructed (not at module load) so simply
 * importing this module — e.g. during `next build`'s route analysis —
 * never fails just because env vars aren't loaded yet; the clear error from
 * `getSupabaseEnv` only surfaces when a request actually needs the client.
 */
let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  if (!cachedClient) {
    const { url, secretKey } = getSupabaseEnv();
    cachedClient = createClient(url, secretKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return cachedClient;
}
