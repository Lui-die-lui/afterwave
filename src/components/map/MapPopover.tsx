"use client";

import { formatCoord, formatDepth, formatMagnitude } from "@/lib/format";
import { formatKst } from "@/lib/timezone";
import { getMagnitudeGuide } from "@/lib/magnitudeGuide";
import { IconLink, IconX } from "../icons";

export interface MapPopoverData {
  kind: "current" | "previous" | "merged";
  magnitude: number;
  place: string;
  depthKm: number;
  latitude: number;
  longitude: number;
  observedAt: string;
  recordDate: string;
  previousRecordDate?: string;
  sourceUrl: string;
}

const KIND_LABEL: Record<MapPopoverData["kind"], string> = {
  current: "현재 최근 24시간 최대",
  previous: "직전 KST 일별 기록",
  merged: "현재·직전 기록이 같은 지진",
};

export function MapPopover({
  data,
  style,
  onClose,
}: {
  data: MapPopoverData;
  style?: React.CSSProperties;
  onClose: () => void;
}) {
  const guide = getMagnitudeGuide(data.magnitude);
  const indicatorColor = data.kind === "previous" ? "var(--marker-previous)" : "var(--brand)";

  return (
    <div
      role="dialog"
      aria-label={`${KIND_LABEL[data.kind]} 정보`}
      className="eq-popover pointer-events-auto flex flex-col gap-1.5 lg:gap-2"
      data-kind={data.kind}
      style={style}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--ink-2)] lg:gap-2 lg:text-[12px]">
          <span
            aria-hidden
            className="inline-block h-2 w-2 shrink-0"
            style={{
              background: indicatorColor,
              borderRadius: data.kind === "previous" ? 2 : 999,
              transform: data.kind === "previous" ? "rotate(45deg)" : undefined,
            }}
          />
          {KIND_LABEL[data.kind]}
        </p>
        <button
          type="button"
          onClick={onClose}
          aria-label="정보 닫기"
          className="-mr-1 -mt-1 inline-grid h-6 w-6 place-items-center rounded-lg text-[var(--ink-2)] transition-colors hover:bg-[var(--brand-faint)] hover:text-[var(--ink-0)] lg:h-7 lg:w-7"
        >
          <IconX className="h-3 w-3 lg:h-3.5 lg:w-3.5" aria-hidden />
        </button>
      </div>

      <div className="flex items-baseline gap-1.5 lg:gap-2">
        <p className="tabular text-[23px] font-bold leading-none tracking-tight text-[var(--ink-0)] lg:text-[28px]">
          M {formatMagnitude(data.magnitude)}
        </p>
        <p className="truncate text-[11px] text-[var(--ink-1)] lg:text-xs">{guide.level}</p>
      </div>
      <p className="text-[13px] font-medium leading-snug text-[var(--ink-0)] lg:text-sm">{data.place}</p>

      <dl className="eq-popover-kv">
        <dt>깊이</dt>
        <dd className="tabular">{formatDepth(data.depthKm)}</dd>
        <dt>좌표</dt>
        <dd className="tabular">{formatCoord(data.latitude, data.longitude)}</dd>
        <dt>발생 시각</dt>
        <dd className="tabular">{formatKst(data.observedAt)}</dd>
        <dt>기록 날짜</dt>
        <dd className="tabular">{data.previousRecordDate ? `${data.previousRecordDate} · ${data.recordDate}` : data.recordDate}</dd>
      </dl>

      <a
        href={data.sourceUrl}
        target="_blank"
        rel="noreferrer noopener"
        className="aw-link inline-flex w-fit items-center gap-1 text-[12px] lg:gap-1.5 lg:text-[13px]"
      >
        USGS 상세 페이지 열기
        <IconLink className="h-3 w-3 lg:h-3.5 lg:w-3.5" aria-hidden />
      </a>
    </div>
  );
}
