"use client";

import { formatMagnitude } from "@/lib/format";
import type { BoardStatus } from "@/lib/types";
import { EarthquakeRipple } from "./EarthquakeRipple";

export type MarkerVariant = "current" | "previous" | "merged";
export type LabelSide = "below" | "above";
export type LabelAlign = "center" | "start" | "end";

const LABEL_BOX_WIDTH = 240;
const LABEL_BOX_HEIGHT = 32;

/** 10–14px core diameter by magnitude — a small, honest cue, not a damage radius. */
function coreRadiusFor(magnitude: number): number {
  if (magnitude >= 7) return 7;
  if (magnitude >= 5) return 6;
  return 5;
}

/**
 * Renders one earthquake marker inside the already-panned/zoomed map group.
 * `scale(1/k)` counter-scales this group's own children so the marker's
 * on-screen size (core, rings, label) stays constant at any zoom — only its
 * `translate` position (in base projected space) follows the parent's
 * zoom, which is exactly where it should be. The label's side/alignment is
 * decided by the caller from the marker's real screen position so it never
 * gets clipped at a map edge or hidden under a panel.
 */
export function MapMarker({
  variant,
  x,
  y,
  k,
  magnitude,
  status,
  isLoading,
  selected,
  onSelect,
  label,
  ariaLabel,
  labelSide = "below",
  labelAlign = "center",
}: {
  variant: MarkerVariant;
  x: number;
  y: number;
  k: number;
  magnitude: number;
  status: BoardStatus;
  isLoading: boolean;
  selected: boolean;
  onSelect: () => void;
  label: string;
  ariaLabel: string;
  labelSide?: LabelSide;
  labelAlign?: LabelAlign;
}) {
  const isPreviousOnly = variant === "previous";
  const coreRadius = coreRadiusFor(magnitude);
  const glyphExtent = isPreviousOnly ? 13 : 22;

  const labelX = labelAlign === "start" ? -14 : labelAlign === "end" ? 14 - LABEL_BOX_WIDTH : -LABEL_BOX_WIDTH / 2;
  const labelY = labelSide === "above" ? -(glyphExtent + LABEL_BOX_HEIGHT) : glyphExtent;

  return (
    <g
      transform={`translate(${x} ${y}) scale(${1 / k})`}
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-pressed={selected}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect();
        }
      }}
      className="eq-marker"
      data-variant={variant}
      data-status={status}
    >
      {isPreviousOnly ? (
        <g transform="rotate(45)">
          <rect className="eq-marker-previous-outer" x={-8.5} y={-8.5} width={17} height={17} rx={3} />
          <rect className="eq-marker-previous-inner" x={-4} y={-4} width={8} height={8} rx={1.5} />
        </g>
      ) : (
        <>
          <EarthquakeRipple coreRadius={coreRadius} status={status} isLoading={isLoading} />
          {variant === "merged" && (
            <>
              <circle className="eq-marker-previous-ring" r={20} />
              <circle className="eq-marker-previous-ring" r={24} />
            </>
          )}
        </>
      )}

      {selected && <circle className="eq-marker-focus-ring" r={isPreviousOnly ? 16 : 28} />}

      <foreignObject
        x={labelX}
        y={labelY}
        width={LABEL_BOX_WIDTH}
        height={LABEL_BOX_HEIGHT}
        style={{ overflow: "visible", pointerEvents: "none" }}
      >
        <div className="eq-marker-label-wrap" data-align={labelAlign}>
          <div className="eq-marker-label">
            <span className="eq-marker-label-dot" aria-hidden />
            {label} · M {formatMagnitude(magnitude)}
          </div>
        </div>
      </foreignObject>
    </g>
  );
}
