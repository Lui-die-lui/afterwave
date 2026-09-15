import { formatKst } from "@/lib/timezone";
import type { BoardState } from "@/lib/types";
import { IconRefresh, IconWaveform } from "./icons";
import { StatusBadge } from "./StatusBadge";

export function Header({
  state,
  onRetry,
  retrying,
}: {
  state: BoardState;
  onRetry: () => void;
  retrying: boolean;
}) {
  return (
    <header className="glass-bar mx-3 mt-3 flex h-auto flex-wrap items-center justify-between gap-2 rounded-2xl px-4 py-2.5 sm:mx-4 sm:mt-4 lg:h-14 lg:flex-nowrap lg:py-0">
      <div className="flex items-center gap-2">
        <IconWaveform className="h-5 w-5 shrink-0 text-[var(--status-fresh)]" aria-hidden />
        <div className="leading-tight">
          <p className="text-sm font-semibold">AFTERWAVE</p>
          <p className="text-[11px] text-[var(--ink-2)]">오늘 지구가 남긴 가장 큰 신호</p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2.5">
        <StatusBadge status={state.status} size="sm" />
        <span className="tabular hidden text-xs text-[var(--ink-2)] sm:inline">
          마지막 조회 {formatKst(state.requestedAt)}
        </span>
        <button
          type="button"
          onClick={onRetry}
          disabled={retrying}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--panel-border)] px-3 py-1 text-xs font-medium hover:border-white/40 disabled:opacity-50"
        >
          <IconRefresh className={`h-3.5 w-3.5 ${retrying ? "animate-spin" : ""}`} aria-hidden />
          {retrying ? "조회 중…" : "다시 시도"}
        </button>
      </div>
    </header>
  );
}
