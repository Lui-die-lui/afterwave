import { NextResponse } from "next/server";
import { SCENARIOS, runSyntheticScenario, type ScenarioKey } from "@/lib/syntheticRunner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isScenarioKey(value: unknown): value is ScenarioKey {
  return typeof value === "string" && (SCENARIOS as readonly string[]).includes(value);
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "요청 본문이 JSON이 아닙니다." }, { status: 400 });
  }

  const scenario = body && typeof body === "object" ? (body as Record<string, unknown>).scenario : undefined;
  if (!isScenarioKey(scenario)) {
    return NextResponse.json(
      { error: `scenario는 다음 중 하나여야 합니다: ${SCENARIOS.join(", ")}` },
      { status: 400 }
    );
  }

  try {
    const state = await runSyntheticScenario(scenario);
    return NextResponse.json(state, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    // Storage-layer failure (e.g. the Supabase migration for
    // afterwave_synthetic_state hasn't been run yet) — a clean JSON error
    // instead of an unhandled 500. `runSyntheticScenario` already catches
    // and classifies every FEED/scenario-logic failure itself; anything
    // that still throws here is the storage layer, not the scenario.
    return NextResponse.json(
      { error: "합성 상태 저장소에 연결하지 못했습니다. Supabase 마이그레이션(0002_create_afterwave_synthetic_state.sql)을 실행했는지 확인해주세요." },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
