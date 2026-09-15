import { NextResponse } from "next/server";
import { getLatestBoardState } from "@/lib/board";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const state = await getLatestBoardState();
  return NextResponse.json(state, {
    headers: { "Cache-Control": "no-store, max-age=0" },
  });
}
