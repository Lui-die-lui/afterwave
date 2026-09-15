import { formatDelta, formatMagnitude } from "@/lib/format";
import { formatKst } from "@/lib/timezone";
import type { BoardState } from "@/lib/types";
import { IconArrowDown, IconArrowUp, IconMinus } from "./icons";
import { MagnitudeInterpretation } from "./MagnitudeInterpretation";
import { StatusBadge } from "./StatusBadge";

export function LeftPanel({ state }: { state: BoardState }) {
  const { current, change, waitingForNextDay, status, records } = state;

  return (
    <aside className="glass-panel flex h-full flex-col gap-4 overflow-y-auto p-4 sm:p-5" aria-label="현재 지진 및 전날 비교">
      <section className="flex flex-col gap-3" aria-labelledby="left-current-heading">
        <div className="flex items-center justify-between gap-2">
          <h2 id="left-current-heading" className="text-xs font-medium uppercase tracking-wide text-[var(--ink-2)]">
            최근 24시간 최대 규모
          </h2>
          <StatusBadge status={status} size="sm" />
        </div>

        {current ? (
          <>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-semibold text-[var(--ink-1)]">{current.unit}</span>
              <span className="tabular text-6xl font-bold leading-none tracking-tight">
                {formatMagnitude(current.magnitude)}
              </span>
            </div>
            <p className="text-base font-medium text-[var(--ink-0)]">{current.place}</p>
            <p className="tabular text-xs text-[var(--ink-2)]">발생 {formatKst(current.observedAt)}</p>

            <div className="h-px bg-white/10" />

            <MagnitudeInterpretation magnitude={current.magnitude} mmiMax={current.mmiMax} />

            {status !== "fresh" && state.errorMessage && (
              <div className="rounded-2xl border border-[var(--status-stale)]/30 bg-black/20 p-3 text-xs text-[var(--ink-1)]" role="alert">
                <p className="font-semibold text-[var(--ink-0)]">{state.errorTitle}</p>
                <p className="mt-1">{state.errorMessage}</p>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-[var(--ink-1)]">
            아직 실제 조회에 성공한 기록이 없습니다. 임의의 기본값(0, -)은 표시하지 않습니다.
          </p>
        )}
      </section>

      <div className="h-px bg-white/10" />

      <section className="flex flex-col gap-2.5" aria-labelledby="left-history-heading">
        <h2 id="left-history-heading" className="text-xs font-medium uppercase tracking-wide text-[var(--ink-2)]">
          어제 대비 · 일별 기록
        </h2>

        {change ? (
          <div className="flex items-center justify-between rounded-2xl bg-white/5 px-3 py-2.5">
            <div className="text-xs text-[var(--ink-2)]">
              {change.previousDate} → {change.currentDate}
            </div>
            <span
              className="inline-flex items-center gap-1 text-sm font-semibold"
              style={{ color: change.delta > 0 ? "var(--tone-high)" : change.delta < 0 ? "var(--status-fresh)" : "var(--ink-1)" }}
            >
              {change.delta > 0 ? (
                <IconArrowUp className="h-3.5 w-3.5" aria-hidden />
              ) : change.delta < 0 ? (
                <IconArrowDown className="h-3.5 w-3.5" aria-hidden />
              ) : (
                <IconMinus className="h-3.5 w-3.5" aria-hidden />
              )}
              {formatDelta(change.delta)}
            </span>
          </div>
        ) : (
          <p className="text-xs text-[var(--ink-1)]">
            다음 실제 KST 날짜 기록 대기 중 — 실제 일별 기록이 아직 2건이 아닙니다.
          </p>
        )}

        {records.length > 0 && (
          <ul className="flex flex-col gap-1.5">
            {records.map((r) => (
              <li key={r.recordDate} className="flex items-center justify-between rounded-xl bg-white/[0.03] px-3 py-1.5 text-xs">
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
      </section>
    </aside>
  );
}
