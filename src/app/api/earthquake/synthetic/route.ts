import { NextResponse } from "next/server";
import { getSyntheticState } from "@/lib/syntheticRunner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  try {
    const state = await getSyntheticState();
    return NextResponse.json(state, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    // Storage-layer failure (e.g. the Supabase migration for
    // afterwave_synthetic_state hasn't been run yet) — a clean JSON error
    // instead of an unhandled 500, and never a crash that could be mistaken
    // for a real-data failure.
    return NextResponse.json(
      { error: "합성 상태 저장소에 연결하지 못했습니다. Supabase 마이그레이션(0002_create_afterwave_synthetic_state.sql)을 실행했는지 확인해주세요." },
      { status: 503, headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  }
}
