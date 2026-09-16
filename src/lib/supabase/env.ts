import "server-only";

export interface SupabaseEnv {
  url: string;
  secretKey: string;
}

/**
 * Canonical names are `SUPABASE_URL` / `SUPABASE_SECRET_KEY` (see
 * `.env.example`). `NEXT_PUBLIC_SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY`
 * are also accepted — that's what a fresh Supabase project's own dashboard
 * suggests by default, and this repo's local `.env.local` already uses
 * those names. Either name satisfies its slot; never both required.
 *
 * Throws a clear, actionable error naming which variable is missing —
 * never the value itself — instead of letting a later Supabase client call
 * fail with an opaque network/auth error.
 */
export function getSupabaseEnv(): SupabaseEnv {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing: string[] = [];
  if (!url) missing.push("SUPABASE_URL (or NEXT_PUBLIC_SUPABASE_URL)");
  if (!secretKey) missing.push("SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY)");

  if (missing.length > 0) {
    throw new Error(
      `Supabase 환경변수가 설정되지 않았습니다: ${missing.join(", ")}. ` +
        "프로젝트 루트의 .env.local(로컬) 또는 배포 환경 변수(Vercel)에 값을 추가해주세요."
    );
  }

  return { url: url as string, secretKey: secretKey as string };
}
