import { formatKst } from "@/lib/timezone";
import type { BoardState } from "@/lib/types";
import { IconRefresh, IconWaveform } from "./icons";
import { PreviewBadge } from "./PreviewBadge";
import { StatusBadge } from "./StatusBadge";
import { ThemeToggle } from "./ThemeToggle";

export function Header({
  state,
  onRetry,
  retrying,
  isPreview,
  onExitPreview,
}: {
  state: BoardState;
  onRetry: () => void;
  retrying: boolean;
  isPreview: boolean;
  onExitPreview: () => void;
}) {
  return (
    <header
      id="aw-header"
      className="aw-header flex h-auto flex-col px-4 py-2.5 sm:px-5 lg:px-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-2 lg:h-[60px] lg:flex-nowrap lg:py-0">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="aw-logo-mark" aria-hidden>
            <IconWaveform className="h-4 w-4" aria-hidden />
          </span>
          <div className="min-w-0 leading-tight">
            <p className="text-[14px] font-semibold tracking-tight text-[var(--ink-0)]">
              AFTERWAVE
              <span className="aw-logo-dot" aria-hidden />
            </p>
            <p className="hidden truncate text-[11px] text-[var(--ink-2)] sm:block">오늘 지구가 남긴 가장 큰 신호</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 sm:flex-nowrap">
          {isPreview ? <PreviewBadge size="sm" /> : <StatusBadge status={state.status} size="sm" />}
          <span className="tabular hidden text-xs text-[var(--ink-2)] md:inline">마지막 조회 {formatKst(state.requestedAt)}</span>
          <ThemeToggle />
          <button type="button" onClick={onRetry} disabled={retrying || isPreview} className="aw-btn aw-btn-brand">
            <IconRefresh className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} aria-hidden />
            {retrying ? "조회 중…" : "다시 시도"}
          </button>
        </div>
      </div>

      {/* Rendered INSIDE the header element (not a separate banner) so
          `useMapSafeArea`'s existing `#aw-header` bottom-edge measurement
          automatically grows to include it — no separate safe-area wiring
          needed for the map to stay clear of this extra row. */}
      {isPreview && (
        <div
          role="status"
          className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-t border-[var(--border-glass)] py-2"
        >
          <p className="max-w-[60ch] text-xs leading-snug text-[var(--ink-1)]">
            현재 화면은 디자인과 일별 비교 동작을 확인하기 위한 합성 시험입니다.
            <br className="hidden sm:block" />
            실제 USGS 기록과 실제 일별 저장값에는 영향을 주지 않습니다.
          </p>
          <button type="button" onClick={onExitPreview} className="aw-btn aw-btn-sm shrink-0">
            실제 데이터로 돌아가기
          </button>
        </div>
      )}
    </header>
  );
}
