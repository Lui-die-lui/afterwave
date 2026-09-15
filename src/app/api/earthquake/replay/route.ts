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

  const state = await runSyntheticScenario(scenario);
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
