import { formatDelta, formatMagnitude } from "@/lib/format";
import { formatKst } from "@/lib/timezone";
import type { BoardState, DailyRecord } from "@/lib/types";
import { IconArrowDown, IconArrowUp, IconMinus } from "./icons";
import { MagnitudeInterpretation } from "./MagnitudeInterpretation";
import { PreviewBadge } from "./PreviewBadge";
import { SideRail, type PanelState } from "./SideRail";
import { StatusBadge } from "./StatusBadge";
import { Widget } from "./Widget";

function DeltaValue({ delta }: { delta: number }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-sm font-semibold"
      style={{ color: delta > 0 ? "var(--tone-high)" : delta < 0 ? "var(--status-fresh)" : "var(--ink-1)" }}
    >
      {delta > 0 ? (
        <IconArrowUp className="h-3.5 w-3.5" aria-hidden />
      ) : delta < 0 ? (
        <IconArrowDown className="h-3.5 w-3.5" aria-hidden />
      ) : (
        <IconMinus className="h-3.5 w-3.5" aria-hidden />
      )}
      {formatDelta(delta)}
    </span>
  );
}

/** The four rows the preview spec asks for — a dedicated layout rather than
 *  reusing the normal history list, since it needs a third (two-days-ago)
 *  row that production's exactly-two-record contract never has. */
function DailyComparisonPreviewRows({
  current,
  previous,
  delta,
  twoDaysAgo,
}: {
  current: DailyRecord;
  previous: DailyRecord;
  delta: number | null;
  twoDaysAgo: DailyRecord;
}) {
  return (
    <ul className="flex flex-col">
      <li className="aw-row text-xs">
        <span className="text-[var(--ink-2)]">오늘 합성 기록</span>
        <span className="tabular font-semibold text-[var(--ink-0)]">
          {current.unit} {formatMagnitude(current.magnitude)}
        </span>
      </li>
      <li className="aw-row text-xs">
        <span className="text-[var(--ink-2)]">직전 합성 기록</span>
        <span className="tabular font-semibold text-[var(--ink-0)]">
          {previous.unit} {formatMagnitude(previous.magnitude)}
        </span>
      </li>
      <li className="aw-row text-xs">
        <span className="text-[var(--ink-2)]">직전 대비</span>
        {delta !== null ? <DeltaValue delta={delta} /> : <span className="text-[var(--ink-1)]">—</span>}
      </li>
      <li className="aw-row text-xs">
        <span className="text-[var(--ink-2)]">2일 전 합성 기록</span>
        <span className="tabular font-semibold text-[var(--ink-0)]">
          {twoDaysAgo.unit} {formatMagnitude(twoDaysAgo.magnitude)}
        </span>
      </li>
    </ul>
  );
}

export function LeftPanel({
  state,
  panelState,
  onToggle,
  isPreview,
  twoDaysAgo,
}: {
  state: BoardState;
  panelState: PanelState;
  onToggle: () => void;
  isPreview: boolean;
  twoDaysAgo: DailyRecord | null;
}) {
  const { current, change, waitingForNextDay, status, records } = state;

  return (
    <SideRail
      side="left"
      panelState={panelState}
      onToggle={onToggle}
      title="현재 정보"
      openLabel="현재 정보 열기"
      closeLabel="현재 정보 접기"
      panelId="left-rail-panel"
      ariaLabel="현재 최대 지진, 규모 해석, 어제 대비"
    >
      <Widget title="최근 24시간 최대 규모" headingId="left-current-heading" emphasis="primary" order={2} className="flex flex-col gap-1.5">
        <div className="flex items-center justify-end">
          {isPreview ? <PreviewBadge size="sm" /> : <StatusBadge status={status} size="sm" />}
        </div>

        {current ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-semibold text-[var(--ink-1)]">{current.unit}</span>
              <span className="tabular text-[length:var(--mag-font-size)] font-bold leading-none tracking-tight text-[var(--ink-0)]">
                {formatMagnitude(current.magnitude)}
              </span>
            </div>
            <p className="text-base font-medium text-[var(--ink-0)]">{current.place}</p>
            <p className="tabular text-xs text-[var(--ink-2)]">발생 {formatKst(current.observedAt)}</p>

            {!isPreview && status !== "fresh" && state.errorMessage && (
              <p className="border-l-2 pl-2.5 text-xs leading-tight text-[var(--ink-1)]" style={{ borderColor: "var(--status-stale)" }} role="alert">
                <span className="font-semibold" style={{ color: "var(--status-stale)" }}>
                  {state.errorTitle}
                </span>{" "}
                · {state.errorMessage}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-[var(--ink-1)]">
            아직 실제 조회에 성공한 기록이 없습니다. 임의의 기본값(0, -)은 표시하지 않습니다.
          </p>
        )}
      </Widget>

      {current && (
        <Widget title="규모 해석" headingId="left-guide-heading" order={3}>
          <MagnitudeInterpretation magnitude={current.magnitude} mmiMax={current.mmiMax} />
        </Widget>
      )}

      <Widget title="어제 대비 · 일별 기록" headingId="left-history-heading" order={7} className="flex flex-col gap-1.5">
        {isPreview && current && records.length === 2 && twoDaysAgo ? (
          <>
            <p className="text-[11px] text-[var(--ink-2)]">합성 시험 fixture — 실제 저장값에는 반영되지 않습니다.</p>
            <DailyComparisonPreviewRows current={records[1]} previous={records[0]} delta={change?.delta ?? null} twoDaysAgo={twoDaysAgo} />
          </>
        ) : (
          <>
            {change ? (
              <div className="aw-row">
                <div className="tabular text-xs text-[var(--ink-2)]">
                  {change.previousDate} → {change.currentDate}
                </div>
                <DeltaValue delta={change.delta} />
              </div>
            ) : (
              <p className="text-xs text-[var(--ink-1)]">
                다음 실제 KST 날짜 기록 대기 중 — 실제 일별 기록이 아직 2건이 아닙니다.
              </p>
            )}

            {records.length > 0 && (
              <ul className="flex flex-col">
                {records.map((r) => (
                  <li key={r.recordDate} className="aw-row text-xs">
                    <span className="tabular text-[var(--ink-2)]">{r.recordDate}</span>
                    <span className="tabular font-semibold text-[var(--ink-0)]">
                      {r.unit} {formatMagnitude(r.magnitude)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            {waitingForNextDay && records.length > 0 && (
              <p className="text-[11px] text-[var(--ink-2)]">데이터를 조작하지 않고 다음 실제 날짜 성공 조회를 기다립니다.</p>
            )}
          </>
        )}
      </Widget>
    </SideRail>
  );
}
