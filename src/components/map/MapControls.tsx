"use client";

import { IconClock, IconGlobe, IconMinus, IconPlus, IconTarget } from "../icons";

/**
 * Compact floating toolbar. Icons are neutral; only "move to the current
 * earthquake" carries the brand color, since that is the one action tied to
 * the highlighted epicenter. Total height stays under 200px even with the
 * optional previous-record button.
 */
export function MapControls({
  onZoomIn,
  onZoomOut,
  onFocusCurrent,
  onFocusPrevious,
  onReset,
  hasPrevious,
  canZoomIn,
  canZoomOut,
  style,
}: {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFocusCurrent: () => void;
  onFocusPrevious?: () => void;
  onReset: () => void;
  hasPrevious: boolean;
  canZoomIn: boolean;
  canZoomOut: boolean;
  style?: React.CSSProperties;
}) {
  return (
    <div className="aw-map-controls" style={style} role="group" aria-label="지도 조작">
      <button type="button" onClick={onZoomIn} disabled={!canZoomIn} title="지도 확대" aria-label="지도 확대">
        <IconPlus className="h-4 w-4" aria-hidden />
      </button>
      <button type="button" onClick={onZoomOut} disabled={!canZoomOut} title="지도 축소" aria-label="지도 축소">
        <IconMinus className="h-4 w-4" aria-hidden />
      </button>
      <div className="aw-map-controls-sep" aria-hidden />
      <button type="button" onClick={onFocusCurrent} data-brand="true" title="현재 최대 지진 위치로 이동" aria-label="현재 최대 지진 위치로 이동">
        <IconTarget className="h-4 w-4" aria-hidden />
      </button>
      {hasPrevious && onFocusPrevious && (
        <button type="button" onClick={onFocusPrevious} title="직전 일별 기록 위치로 이동" aria-label="직전 일별 기록 위치로 이동">
          <IconClock className="h-4 w-4" aria-hidden />
        </button>
      )}
      <button type="button" onClick={onReset} title="전체 세계지도 보기" aria-label="전체 세계지도 보기">
        <IconGlobe className="h-4 w-4" aria-hidden />
      </button>
    </div>
  );
}
