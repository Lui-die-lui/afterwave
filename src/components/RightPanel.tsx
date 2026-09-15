"use client";

import { useState } from "react";
import { formatCoord, formatDepth } from "@/lib/format";
import { formatKst } from "@/lib/timezone";
import type { BoardState, SyntheticState } from "@/lib/types";
import { IconCheckCircle, IconLink, IconRefresh } from "./icons";
import { StatusBadge } from "./StatusBadge";
import { TrustDialog } from "./TrustDialog";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-white/8 py-1 text-xs last:border-none">
      <dt className="text-[var(--ink-2)]">{label}</dt>
      <dd className="tabular text-right font-medium text-[var(--ink-0)]">{value}</dd>
    </div>
  );
}

export function RightPanel({
  state,
  onRetry,
  retrying,
  syntheticState,
}: {
  state: BoardState;
  onRetry: () => void;
  retrying: boolean;
  syntheticState: SyntheticState | null;
}) {
  const { current } = state;
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <aside className="glass-panel flex h-full flex-col gap-2 overflow-y-auto p-4 sm:p-5" aria-label="상세 정보 및 데이터 신뢰 상태">
      <section aria-labelledby="right-detail-heading" className="flex flex-col gap-1">
        <h2 id="right-detail-heading" className="mb-1 text-xs font-medium uppercase tracking-wide text-[var(--ink-2)]">
          상세 정보
        </h2>
        {current ? (
          <>
            <dl>
              <DetailRow label="깊이" value={formatDepth(current.depthKm)} />
              <DetailRow label="좌표" value={formatCoord(current.latitude, current.longitude)} />
              <DetailRow label="발생 시각" value={formatKst(current.observedAt)} />
              <DetailRow label="USGS 자료 수정 시각" value={formatKst(current.sourceUpdatedAt)} />
              <DetailRow label="USGS 피드 생성 시각" value={formatKst(current.sourceGeneratedAt)} />
              <DetailRow label="서비스 조회 시각" value={formatKst(state.requestedAt)} />
              <DetailRow label="기준 시간대" value="Asia/Seoul (KST, UTC+9)" />
            </dl>
            <a
              href={current.sourceUrl}
              target="_blank"
              rel="noreferrer noopener"
              className="mt-1.5 inline-flex w-fit items-center gap-1.5 text-sm underline decoration-white/30 underline-offset-4 hover:decoration-white/70"
            >
              <IconLink className="h-3.5 w-3.5" aria-hidden />
              USGS 상세 페이지
            </a>
          </>
        ) : (
          <p className="text-sm text-[var(--ink-1)]">표시할 상세 정보가 없습니다.</p>
        )}
      </section>

      <div className="h-px bg-white/10" />

      <section aria-labelledby="right-trust-heading" className="flex flex-col gap-1.5">
        <h2 id="right-trust-heading" className="text-xs font-medium uppercase tracking-wide text-[var(--ink-2)]">
          데이터 신뢰 상태
        </h2>
        {current ? (
          <button
            type="button"
            onClick={() => setDialogOpen(true)}
            className="flex items-center justify-between gap-2 rounded-xl bg-white/5 px-3 py-1.5 text-left text-xs hover:bg-white/[0.08]"
          >
            <span className="inline-flex items-center gap-1.5 text-[var(--status-fresh)]">
              <IconCheckCircle className="h-3.5 w-3.5" aria-hidden />
              원자료 = 저장값 = 화면값 일치
            </span>
            <span className="text-[var(--ink-2)] underline decoration-white/20 underline-offset-2">세부 대조 보기</span>
          </button>
        ) : (
          <p className="text-xs text-[var(--ink-1)]">대조할 값이 아직 없습니다.</p>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <StatusBadge status={state.status} size="sm" />
          {state.lastSuccessAt && (
            <span className="tabular text-[var(--ink-2)]">마지막 정상 조회 {formatKst(state.lastSuccessAt)}</span>
          )}
        </div>

        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex w-fit items-center gap-1.5 rounded-full border border-[var(--panel-border)] px-3.5 py-1 text-sm font-medium hover:border-white/40 disabled:opacity-50"
        >
          <IconRefresh className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} aria-hidden />
          {retrying ? "조회 중…" : "다시 시도"}
        </button>
      </section>

      <div className="h-px bg-white/10" />

      <section aria-labelledby="right-synthetic-heading" className="flex flex-col gap-1.5">
        <h2 id="right-synthetic-heading" className="text-xs font-medium uppercase tracking-wide text-[var(--ink-2)]">
          합성 시험 (Failure Lab) 결과
        </h2>
        {syntheticState ? (
          <>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <StatusBadge status={syntheticState.status} size="sm" />
              <span className="text-[var(--ink-2)]">error_code: {syntheticState.errorCode}</span>
            </div>
            {syntheticState.lastScenario && (
              <p className="text-xs text-[var(--ink-2)]">최근 재생: {syntheticState.lastScenario}</p>
            )}
            {syntheticState.errorMessage ? (
              <div className="rounded-xl bg-black/20 p-2 text-xs text-[var(--ink-1)]" role="status">
                <p className="font-semibold text-[var(--ink-0)]">{syntheticState.errorTitle}</p>
                <p className="mt-0.5">{syntheticState.errorMessage}</p>
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-1)]">현재 합성 상태는 정상(fresh)입니다.</p>
            )}
          </>
        ) : (
          <p className="text-xs text-[var(--ink-1)]">하단 실패 실험실에서 시나리오를 재생하면 결과가 여기에 표시됩니다.</p>
        )}
        <p className="text-[11px] text-[var(--ink-2)]">실제 일별 기록과는 완전히 분리된 합성 저장소입니다.</p>
      </section>

      <TrustDialog open={dialogOpen} onClose={() => setDialogOpen(false)} current={current} />
    </aside>
  );
}
