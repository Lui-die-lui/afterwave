import { IconAlertTriangle, IconCheckCircle, IconHourglass, IconXCircle } from "./icons";
import type { BoardStatus } from "@/lib/types";

const STATUS_META: Record<BoardStatus, { label: string; icon: typeof IconCheckCircle; color: string }> = {
  fresh: { label: "최신 (fresh)", icon: IconCheckCircle, color: "var(--status-fresh)" },
  stale: { label: "마지막 정상 확인값 (stale)", icon: IconAlertTriangle, color: "var(--status-stale)" },
  error: { label: "조회 실패 (error)", icon: IconXCircle, color: "var(--status-error)" },
  waiting: { label: "기록 대기 중", icon: IconHourglass, color: "var(--status-waiting)" },
};

export function StatusBadge({ status, size = "md" }: { status: BoardStatus; size?: "sm" | "md" }) {
  const meta = STATUS_META[status];
  const Icon = meta.icon;
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-medium ${pad}`}
      style={{
        color: meta.color,
        borderColor: `color-mix(in srgb, ${meta.color} 45%, transparent)`,
        background: `color-mix(in srgb, ${meta.color} 14%, transparent)`,
      }}
    >
      <Icon className="h-4 w-4 shrink-0" aria-hidden />
      {meta.label}
    </span>
  );
}
