import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const SRC_ROOT = path.resolve(__dirname, "../../");

function listFiles(dir: string, extensions: string[]): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      out.push(...listFiles(full, extensions));
    } else if (extensions.some((ext) => entry.endsWith(ext))) {
      out.push(full);
    }
  }
  return out;
}

function relative(file: string): string {
  return path.relative(SRC_ROOT, file).replace(/\\/g, "/");
}

const allSourceFiles = listFiles(SRC_ROOT, [".ts", ".tsx"]).filter((f) => !f.includes("__tests__"));

// Anything the browser could conceivably load: components, non-API app
// routes/layouts. API route handlers run server-only in Next.js and are
// deliberately excluded, since that's exactly where the secret is meant to
// be used.
const clientReachableFiles = allSourceFiles.filter((f) => {
  const rel = relative(f);
  if (rel.startsWith("app/api/")) return false;
  return rel.startsWith("components/") || rel.startsWith("app/");
});

// Only this one module is allowed to read the raw secret-key env var names —
// everything else must go through it rather than reading process.env itself.
const SECRET_READER_ALLOWLIST = new Set(["lib/supabase/env.ts"]);

const syntheticFiles = allSourceFiles.filter((f) => {
  const rel = relative(f);
  return (
    rel.includes("syntheticStore") ||
    rel.includes("syntheticStateRepository") ||
    rel.includes("syntheticRunner") ||
    rel.includes("fixtures/syntheticFeed") ||
    rel.includes("fixtures/dailyComparisonPreview")
  );
});

const realStoreFiles = allSourceFiles.filter((f) => {
  const rel = relative(f);
  return rel === "lib/realStore.ts" || (rel.startsWith("lib/supabase/") && !rel.includes("syntheticStateRepository"));
});

describe("security boundary — Supabase secret never reaches client-reachable code", () => {
  it("no component or non-API app route imports the Supabase admin client, repository, or env module", () => {
    const offenders = clientReachableFiles.filter((f) => {
      const content = readFileSync(f, "utf8");
      return (
        /supabase\/(supabaseAdmin|realRecordsRepository|env|syntheticStateRepository)/.test(content) ||
        /from ["']\.\.?\/.*realStore["']/.test(content)
      );
    });
    expect(offenders.map(relative)).toEqual([]);
  });

  it("no component or non-API app route references the secret-key env var names directly", () => {
    const offenders = clientReachableFiles.filter((f) => {
      const content = readFileSync(f, "utf8");
      return content.includes("SUPABASE_SECRET_KEY") || content.includes("SUPABASE_SERVICE_ROLE_KEY");
    });
    expect(offenders.map(relative)).toEqual([]);
  });

  it("only lib/supabase/env.ts reads the raw secret-key env var names — everything else goes through it", () => {
    const offenders = allSourceFiles.filter((f) => {
      const rel = relative(f);
      if (SECRET_READER_ALLOWLIST.has(rel)) return false;
      const content = readFileSync(f, "utf8");
      return content.includes("process.env.SUPABASE_SECRET_KEY") || content.includes("process.env.SUPABASE_SERVICE_ROLE_KEY");
    });
    expect(offenders.map(relative)).toEqual([]);
  });

  it("the secret key is never given a NEXT_PUBLIC_ alias anywhere in source", () => {
    const offenders = allSourceFiles.filter((f) => {
      const content = readFileSync(f, "utf8");
      return /NEXT_PUBLIC_SUPABASE_SECRET/.test(content) || /NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/.test(content);
    });
    expect(offenders.map(relative)).toEqual([]);
  });

  it(".env.example lists only canonical variable names with no values", () => {
    const content = readFileSync(path.resolve(SRC_ROOT, "../.env.example"), "utf8");
    const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
    for (const line of lines) {
      expect(line).toMatch(/^SUPABASE_(URL|SECRET_KEY)=\s*$/);
    }
  });
});

describe("security boundary — real vs synthetic storage separation", () => {
  it("synthetic scenario code never imports the real (Supabase-backed) store or repository", () => {
    expect(syntheticFiles.length).toBeGreaterThan(0);
    const offenders = syntheticFiles.filter((f) => {
      const content = readFileSync(f, "utf8");
      return /from ["']\.\.?\/.*realStore["']/.test(content) || /supabase\/(supabaseAdmin|realRecordsRepository)/.test(content);
    });
    expect(offenders.map(relative)).toEqual([]);
  });

  it("the real repository/table module never imports the synthetic store", () => {
    const offenders = realStoreFiles.filter((f) => readFileSync(f, "utf8").includes("syntheticStore"));
    expect(offenders.map(relative)).toEqual([]);
  });

  it("synthetic-store code never actually QUERIES the real table (afterwave_daily_records) — a mention in a doc comment explaining the separation is fine, calling .from() on it is not", () => {
    const offenders = syntheticFiles.filter((f) => /from\(["']afterwave_daily_records["']\)/.test(readFileSync(f, "utf8")));
    expect(offenders.map(relative)).toEqual([]);
  });

  it("real-store code never actually QUERIES the synthetic table (afterwave_synthetic_state)", () => {
    const offenders = realStoreFiles.filter((f) => /from\(["']afterwave_synthetic_state["']\)/.test(readFileSync(f, "utf8")));
    expect(offenders.map(relative)).toEqual([]);
  });

  it("the daily-comparison preview fixture never calls fetch/an API route — it can only ever be an in-memory object, never a network write", () => {
    const previewFile = allSourceFiles.find((f) => relative(f) === "lib/fixtures/dailyComparisonPreview.ts");
    expect(previewFile).toBeTruthy();
    const content = readFileSync(previewFile as string, "utf8");
    expect(content).not.toMatch(/fetch\(/);
    expect(content).not.toMatch(/\/api\/earthquake/);
    expect(content).not.toMatch(/upsertSyntheticRecord\(|upsertRealRecord\(/);
  });
});
