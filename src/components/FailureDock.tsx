"use client";

import { useCallback, useEffect, useState } from "react";
import type { ScenarioKey } from "@/lib/syntheticRunner";
import type { SyntheticState } from "@/lib/types";
import { IconChevronDown, IconChevronUp, IconRefresh } from "./icons";
import { StatusBadge } from "./StatusBadge";

const SCENARIO_BUTTONS: { key: ScenarioKey; label: string; hint: string }[] = [
  { key: "D1_A", label: "정상 D1-A", hint: "합성 1일차 초기화" },
  { key: "D1_B", label: "같은 날 D1-B", hint: "같은 날 재조회 — 한 행 유지 확인" },
  { key: "TIMEOUT", label: "느린 응답", hint: "timeout 재생" },
  { key: "UPSTREAM_AUTH", label: "401/403", hint: "외부 원천 접근 거부 재생" },
  { key: "RATE_LIMITED", label: "429", hint: "호출 제한 재생" },
  { key: "OFFLINE", label: "오프라인", hint: "네트워크 단절 재생" },
  { key: "SCHEMA_CHANGED", label: "형식 변경", hint: "응답 스키마 드리프트 재생" },
  { key: "RECOVER_D2", label: "Recover D2", hint: "fresh 복구 + 다음 날짜 기록 1건 추가" },
];

export function FailureDock({
  previewActive,
  onEnterPreview,
  onExitPreview,
  open,
  onToggle,
}: {
  previewActive: boolean;
  onEnterPreview: () => void;
  onExitPreview: () => void;
  /** Desktop-only collapse (mirrors the left/right side rails) — mobile always shows the dock. */
  open: boolean;
  onToggle: () => void;
}) {
  const [pending, setPending] = useState<ScenarioKey | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [syntheticState, setSyntheticState] = useState<SyntheticState | null>(null);

  const loadInitial = useCallback(async () => {
    try {
      const res = await fetch("/api/earthquake/synthetic", { cache: "no-store" });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `합성 상태 조회 실패 (${res.status})`);
      }
      const data = (await res.json()) as SyntheticState;
      setSyntheticState(data);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "합성 상태를 불러오지 못했습니다.");
    }
  }, []);

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
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `합성 시나리오 재생 요청 실패 (${res.status})`);
      }
      const data = (await res.json()) as SyntheticState;
      setSyntheticState(data);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "합성 시나리오 재생 요청이 실패했습니다.");
    } finally {
      setPending(null);
    }
  }

  const activeScenario = syntheticState?.lastScenario ?? null;

  return (
    <>
      <div id="aw-dock-panel" className="aw-dock flex flex-col gap-2 px-3.5 py-2.5" role="group" aria-label="실패 실험실 — 합성 시험 전용">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <div className="flex min-w-0 flex-wrap items-center gap-x-2.5 gap-y-1">
            <p className="text-[12px] font-semibold text-[var(--ink-0)]">실패 실험실</p>
            <span className="hidden text-[11px] text-[var(--ink-2)] sm:inline">합성 시험 전용 · 실제 기록 미변경</span>
            {syntheticState && <StatusBadge status={syntheticState.status} size="sm" />}
            {activeScenario && (
              <span className="tabular hidden text-[11px] text-[var(--ink-2)] md:inline">최근 재생: {activeScenario}</span>
            )}
          </div>
          <div className="flex items-center gap-1.5">
            {/* Separate from the API-driven scenarios below: this never
                calls `/api/earthquake/replay` or any other endpoint — it
                only swaps the whole screen to a local, in-memory fixture, so
                it can't write to the synthetic store OR the real Supabase
                table either way. Placed up here (not its own row) so it
                never collides with widgets floating above the dock. */}
            <button
              type="button"
              title="합성 기록 3건으로 지도와 변화 UI 확인"
              aria-pressed={previewActive}
              onClick={previewActive ? onExitPreview : onEnterPreview}
              className={`aw-btn aw-btn-sm ${previewActive ? "aw-btn-brand" : ""}`}
            >
              {previewActive ? "실제 데이터로 돌아가기" : "일별 비교 미리보기"}
            </button>
            <button type="button" onClick={loadInitial} className="aw-btn aw-btn-sm aw-btn-ghost">
              <IconRefresh className="h-3.5 w-3.5" aria-hidden />
              새로고침
            </button>
            <button
              type="button"
              onClick={onToggle}
              aria-expanded={open}
              aria-controls="aw-dock-panel"
              aria-label="실패 실험실 접기"
              title="실패 실험실 접기"
              className="aw-icon-btn hidden lg:inline-grid"
            >
              <IconChevronDown className="h-4 w-4" aria-hidden />
            </button>
          </div>
        </div>

        <div className="aw-dock-seg grid-cols-2 sm:grid-cols-8" role="group" aria-label="합성 시나리오">
          {SCENARIO_BUTTONS.map((btn) => (
            <button
              key={btn.key}
              type="button"
              title={btn.hint}
              aria-pressed={activeScenario === btn.key}
              onClick={() => runScenario(btn.key)}
              disabled={pending !== null}
            >
              {pending === btn.key ? "재생 중…" : btn.label}
            </button>
          ))}
        </div>

        {syntheticState?.errorMessage && (
          <p role="status" className="text-[11px] leading-snug text-[var(--ink-1)]">
            <span className="font-semibold text-[var(--ink-0)]">{syntheticState.errorTitle}</span> · {syntheticState.errorMessage}
          </p>
        )}
        {loadError && (
          <p role="alert" className="text-[11px]" style={{ color: "var(--status-error)" }}>
            {loadError}
          </p>
        )}
      </div>

      <button
        id="aw-dock-tab"
        type="button"
        className="aw-dock-tab"
        aria-expanded={open}
        aria-controls="aw-dock-panel"
        aria-label="실패 실험실 열기"
        title="실패 실험실 열기"
        onClick={onToggle}
      >
        <IconChevronUp className="h-3.5 w-3.5 shrink-0" aria-hidden />
        실패 실험실
      </button>
    </>
  );
}
