import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// The real `server-only` package throws when imported outside Next.js's own
// build pipeline (which aliases it to a no-op on the server); stub it so
// this module can be unit tested directly under plain Vitest.
vi.mock("server-only", () => ({}));

const { getSupabaseEnv } = await import("../env");

const KEYS = ["SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_URL", "SUPABASE_SECRET_KEY", "SUPABASE_SERVICE_ROLE_KEY"] as const;
const saved: Record<string, string | undefined> = {};

beforeEach(() => {
  for (const key of KEYS) {
    saved[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("getSupabaseEnv", () => {
  it("throws a clear, actionable error when both variables are missing, without inventing any value", () => {
    expect(() => getSupabaseEnv()).toThrow(/SUPABASE_URL[\s\S]*SUPABASE_SECRET_KEY/);
  });

  it("names only the missing variable when just one is absent", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    expect(() => getSupabaseEnv()).toThrow(/SUPABASE_SECRET_KEY/);
    expect(() => getSupabaseEnv()).not.toThrow(/SUPABASE_URL \(or/);
  });

  it("accepts the canonical SUPABASE_URL / SUPABASE_SECRET_KEY names", () => {
    process.env.SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SECRET_KEY = "canonical-secret";
    expect(getSupabaseEnv()).toEqual({ url: "https://example.supabase.co", secretKey: "canonical-secret" });
  });

  it("also accepts the dashboard-default NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY names", () => {
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-secret";
    expect(getSupabaseEnv()).toEqual({ url: "https://example.supabase.co", secretKey: "service-role-secret" });
  });

  it("never includes the actual variable value in the thrown error message", () => {
    process.env.SUPABASE_URL = "https://super-secret-project.supabase.co";
    try {
      getSupabaseEnv();
      throw new Error("expected getSupabaseEnv to throw");
    } catch (err) {
      expect(String(err)).not.toContain("super-secret-project");
    }
  });
});
