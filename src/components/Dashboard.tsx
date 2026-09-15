"use client";

import { useState } from "react";
import type { BoardState, SyntheticState } from "@/lib/types";
import { FailureDock } from "./FailureDock";
import { Header } from "./Header";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { WorldMap } from "./map/WorldMap";

const MAP_LEGEND_NOTE = "파동은 이해를 돕는 시각 효과이며 실제 흔들림 범위나 피해 지역을 의미하지 않습니다.";

export function Dashboard({ initialState }: { initialState: BoardState }) {
  const [state, setState] = useState<BoardState>(initialState);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [syntheticState, setSyntheticState] = useState<SyntheticState | null>(null);

  async function retry() {
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch("/api/earthquake/latest", { cache: "no-store" });
      if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
      const data = (await res.json()) as BoardState;
      setState(data);
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "다시 시도 요청에 실패했습니다.");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="aw-stage">
      <div className="lg:relative lg:z-10">
        <Header state={state} onRetry={retry} retrying={retrying} />
      </div>

      <div className="aw-map-layer" aria-hidden={!state.current}>
        <WorldMap state={state} isLoading={retrying} />
        <p className="glass-bar absolute bottom-3 left-1/2 w-max max-w-[88vw] -translate-x-1/2 rounded-full px-3 py-1 text-center text-[11px] text-[var(--ink-2)] lg:hidden">
          {MAP_LEGEND_NOTE}
        </p>
      </div>

      <div className="lg:relative lg:z-10 lg:flex lg:flex-1 lg:flex-col lg:overflow-hidden">
        {retryError && (
          <p role="alert" className="glass-panel mx-3 mt-3 px-4 py-2 text-sm text-[var(--status-error)] sm:mx-4">
            {retryError}
          </p>
        )}

        <div className="grid grid-cols-1 gap-3 p-3 sm:gap-4 sm:p-4 lg:flex-1 lg:grid-cols-[300px_minmax(0,1fr)_320px] lg:overflow-hidden">
          <div className="min-h-[320px] lg:min-h-0">
            <LeftPanel state={state} />
          </div>
          <div aria-hidden className="hidden lg:flex lg:min-h-0 lg:flex-col lg:items-center lg:justify-end lg:pb-2">
            <p className="glass-bar rounded-full px-3 py-1 text-center text-[11px] text-[var(--ink-2)]">
              {MAP_LEGEND_NOTE}
            </p>
          </div>
          <div className="min-h-[420px] lg:min-h-0">
            <RightPanel state={state} onRetry={retry} retrying={retrying} syntheticState={syntheticState} />
          </div>
        </div>
      </div>

      <div className="lg:relative lg:z-10">
        <FailureDock onStateChange={setSyntheticState} />
      </div>

      <p className="px-4 pb-3 text-center text-[11px] text-[var(--ink-2)] lg:hidden">
        로그인 없이 열람할 수 있는 공개 화면입니다. 개인정보를 수집하지 않습니다.
      </p>
    </div>
  );
}
