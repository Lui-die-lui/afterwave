"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScenarioKey } from "@/lib/syntheticRunner";
import type { SyntheticState } from "@/lib/types";
import { IconRefresh } from "./icons";

const SCENARIO_BUTTONS: { key: ScenarioKey; label: string; hint: string }[] = [
  { key: "D1_A", label: "정상 D1-A", hint: "합성 1일차 초기화" },
  { key: "D1_B", label: "같은 날 재조회 D1-B", hint: "한 행 유지 확인" },
  { key: "TIMEOUT", label: "느린 응답", hint: "timeout 재생" },
  { key: "UPSTREAM_AUTH", label: "401 / 403", hint: "접근 거부 재생" },
  { key: "RATE_LIMITED", label: "호출 제한 429", hint: "rate limit 재생" },
  { key: "OFFLINE", label: "오프라인", hint: "네트워크 단절 재생" },
  { key: "SCHEMA_CHANGED", label: "형식 변경", hint: "스키마 드리프트 재생" },
  { key: "RECOVER_D2", label: "Recover D2", hint: "fresh 복구 + 다음 날짜 1건" },
];

export function FailureDock({ onStateChange }: { onStateChange: (state: SyntheticState) => void }) {
  const [pending, setPending] = useState<ScenarioKey | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadInitial = useCallback(async () => {
    try {
      const res = await fetch("/api/earthquake/synthetic", { cache: "no-store" });
      const data = (await res.json()) as SyntheticState;
      onStateChange(data);
    } catch {
      setLoadError("합성 상태를 불러오지 못했습니다.");
    }
  }, [onStateChange]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadInitial();
  }, [loadInitial]);

  async function runScenario(scenario: ScenarioKey) {
    setPending(scenario);
    setLoadError(null);
    try {
      const res = await fetch("/api/earthquake/replay", {
        method: "POST",
        cache: "no-store",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ scenario }),
      });
      const data = (await res.json()) as SyntheticState;
      onStateChange(data);
    } catch {
      setLoadError("합성 시나리오 재생 요청이 실패했습니다.");
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="glass-bar mx-3 mb-3 flex flex-col gap-2 rounded-2xl px-3 py-2.5 sm:mx-4 sm:mb-4 lg:flex-row lg:items-center">
      <p className="shrink-0 text-[11px] font-medium uppercase tracking-wide text-[var(--ink-2)] lg:pr-2">
        실패 실험실 <span className="hidden text-[var(--ink-2)]/70 sm:inline">· 합성 시험 전용, 실제 기록 미변경</span>
      </p>
      <div className="flex flex-1 flex-wrap gap-1.5 overflow-x-auto">
        {SCENARIO_BUTTONS.map((btn) => (
          <button
            key={btn.key}
            type="button"
            title={btn.hint}
            onClick={() => runScenario(btn.key)}
            disabled={pending !== null}
            className="flex shrink-0 flex-col items-start rounded-xl border border-transparent bg-white/5 px-2.5 py-1.5 text-left text-xs leading-tight hover:border-white/20 hover:bg-white/[0.08] disabled:opacity-50"
          >
            <span className="font-medium text-[var(--ink-0)]">{pending === btn.key ? "재생 중…" : btn.label}</span>
            <span className="text-[10px] text-[var(--ink-2)]">{btn.hint}</span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={loadInitial}
        className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--panel-border)] px-2.5 py-1 text-[11px] text-[var(--ink-1)] hover:border-white/40"
      >
        <IconRefresh className="h-3 w-3" aria-hidden />
        새로고침
      </button>
      {loadError && (
        <p role="alert" className="text-[11px] text-[var(--status-error)]">
          {loadError}
        </p>
      )}
    </div>
  );
}
