"use client";

import { useState } from "react";
import { formatCoord, formatDepth } from "@/lib/format";
import { formatKst } from "@/lib/timezone";
import type { BoardState } from "@/lib/types";
import { IconCheckCircle, IconLink, IconRefresh } from "./icons";
import { PreviewBadge } from "./PreviewBadge";
import { SideRail, type PanelState } from "./SideRail";
import { StatusBadge } from "./StatusBadge";
import { TrustDialog } from "./TrustDialog";
import { Widget } from "./Widget";

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-[var(--border-glass)] py-1 text-xs leading-tight last:border-none">
      <dt className="break-keep text-[var(--ink-2)]">{label}</dt>
      <dd className="tabular shrink-0 text-right font-medium text-[var(--ink-0)]">{value}</dd>
    </div>
  );
}

export function RightPanel({
  state,
  onRetry,
  retrying,
  panelState,
  onToggle,
  isPreview,
}: {
  state: BoardState;
  onRetry: () => void;
  retrying: boolean;
  panelState: PanelState;
  onToggle: () => void;
  isPreview: boolean;
}) {
  const { current } = state;
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <SideRail
      side="right"
      panelState={panelState}
      onToggle={onToggle}
      title="상세 정보"
      openLabel="상세 정보 열기"
      closeLabel="상세 정보 접기"
      panelId="right-rail-panel"
      ariaLabel="지진 상세, 데이터 신뢰 상태, 동작"
    >
      <Widget title="지진 상세" headingId="right-detail-heading" order={4}>
        {current ? (
          <dl>
            <DetailRow label="깊이" value={formatDepth(current.depthKm)} />
            <DetailRow label="좌표" value={formatCoord(current.latitude, current.longitude)} />
            <DetailRow label="발생 시각" value={formatKst(current.observedAt)} />
            <DetailRow label={isPreview ? "합성 자료 수정 시각" : "USGS 자료 수정 시각"} value={formatKst(current.sourceUpdatedAt)} />
            <DetailRow label={isPreview ? "합성 피드 생성 시각" : "USGS 피드 생성 시각"} value={formatKst(current.sourceGeneratedAt)} />
            <DetailRow label="서비스 조회 시각" value={formatKst(state.requestedAt)} />
            <DetailRow label="기준 시간대" value="Asia/Seoul (KST, UTC+9)" />
          </dl>
        ) : (
          <p className="text-sm text-[var(--ink-1)]">표시할 상세 정보가 없습니다.</p>
        )}
      </Widget>

      <Widget title="데이터 신뢰 상태" headingId="right-trust-heading" order={5} className="flex flex-col gap-1.5">
        {current ? (
          <p className="inline-flex items-center gap-1.5 text-xs font-medium" style={{ color: isPreview ? "var(--marker-previous)" : "var(--status-fresh)" }}>
            <IconCheckCircle className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {isPreview ? "합성 원자료 → 합성 저장값 → 화면값 일치" : "원자료 = 저장값 = 화면값 일치"}
          </p>
        ) : (
          <p className="text-xs text-[var(--ink-1)]">대조할 값이 아직 없습니다.</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-xs">
          {isPreview ? <PreviewBadge size="sm" /> : <StatusBadge status={state.status} size="sm" />}
        </div>
        {state.lastSuccessAt && (
          <p className="tabular text-xs text-[var(--ink-2)]">마지막 정상 조회 {formatKst(state.lastSuccessAt)}</p>
        )}
        <p className="text-xs text-[var(--ink-2)]">
          출처: {isPreview ? "합성 시험 fixture (T04-DAILY-COMPARISON-PREVIEW)" : "USGS GeoJSON summary feed (all_day)"}
        </p>
      </Widget>

      <Widget title="동작" headingId="right-actions-heading" order={6} className="flex flex-col gap-1.5">
        {isPreview ? (
          <p className="text-xs text-[var(--ink-1)]">
            합성 시험 fixture이므로 실제 USGS 상세 페이지나 원본 피드로 연결되는 링크가 없습니다.
          </p>
        ) : (
          <>
            {current && (
              <a href={current.sourceUrl} target="_blank" rel="noreferrer noopener" className="aw-link inline-flex w-fit items-center gap-1.5 text-sm">
                <IconLink className="h-3.5 w-3.5" aria-hidden />
                USGS 상세 페이지
              </a>
            )}
            <a href={state.feedUrl} target="_blank" rel="noreferrer noopener" className="aw-link inline-flex w-fit items-center gap-1.5 text-xs">
              <IconLink className="h-3 w-3" aria-hidden />
              원본 GeoJSON 피드
            </a>
          </>
        )}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <button type="button" onClick={onRetry} disabled={retrying || isPreview} title={isPreview ? "미리보기 중에는 사용할 수 없습니다." : undefined} className="aw-btn aw-btn-sm">
            <IconRefresh className={`h-4 w-4 ${retrying ? "animate-spin" : ""}`} aria-hidden />
            {retrying ? "조회 중…" : "다시 시도"}
          </button>
          {current && (
            <button type="button" onClick={() => setDialogOpen(true)} className="aw-btn aw-btn-sm aw-btn-ghost">
              원자료 세부 대조 보기
            </button>
          )}
        </div>
      </Widget>

      <TrustDialog open={dialogOpen} onClose={() => setDialogOpen(false)} current={current} isSynthetic={isPreview} />
    </SideRail>
  );
}
