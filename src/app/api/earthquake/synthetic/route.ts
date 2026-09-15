import { NextResponse } from "next/server";
import { getSyntheticState } from "@/lib/syntheticRunner";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const state = await getSyntheticState();
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
