"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { isSameEarthquake } from "@/lib/earthquakeIdentity";
import { formatMagnitude } from "@/lib/format";
import {
  MAP_DEFAULT_FOCUS_ZOOM,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  baseToViewport,
  computeRenderTransform,
  fitPointsInSafeArea,
  recenterForViewportTarget,
} from "@/lib/mapCamera";
import { MAP_VIEWBOX_HEIGHT, MAP_VIEWBOX_WIDTH, projectEquirectangular } from "@/lib/projection";
import type { BoardState } from "@/lib/types";
import { WORLD_LAND_PATH_D } from "@/lib/worldMapPath";
import { MapControls } from "./MapControls";
import { MapMarker, type LabelAlign, type LabelSide } from "./MapMarker";
import { MapPopover, type MapPopoverData } from "./MapPopover";
import { useMapCamera } from "./useMapCamera";
import { useMapSafeArea } from "./useMapSafeArea";

const GRID_LONGITUDES = [-150, -120, -90, -60, -30, 0, 30, 60, 90, 120, 150];
const GRID_LATITUDES = [-60, -30, 0, 30, 60];
const SAFE_MARGIN_PX = 26;

export function WorldMap({ state, isLoading, isPreview = false }: { state: BoardState; isLoading: boolean; isPreview?: boolean }) {
  const current = state.current;
  const previous = state.records.length === 2 ? state.records[0] : null;
  const merged = !!(current && previous && isSameEarthquake(current, previous));

  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const insets = useMapSafeArea(containerRef);
  const { camera, getLatestCamera, viewportSize, isAnimating, focusOn, panTo, reset, zoomIn, zoomOut, handlers, wasDrag } =
    useMapCamera(svgRef);

  const [selected, setSelected] = useState<"current" | "previous" | null>(null);

  const lastFocusedIdRef = useRef<string | null>(null);
  const focusTargetRef = useRef<{ x: number; y: number } | null>(null);

  // One combined effect, deliberately NOT split in two, to avoid a real bug
  // that split version had: focusing a brand-new earthquake calls setCamera
  // (state update, applied on a LATER render), but a safe-area effect keyed
  // only on `insets` would still run in the SAME effect flush reading the
  // OLD pre-focus `camera` from its closure — "correcting" a marker that
  // hadn't moved yet and clobbering the fresh focus with a stale position.
  // Branching on the SAME condition (new id vs same id) inside one effect
  // guarantees only one of the two ever runs per pass, so the safe-area
  // branch only ever reads a `camera` that is NOT about to be superseded by
  // a focus scheduled in this very pass.
  useEffect(() => {
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!svg || !container || !current) return;

    const isNewEarthquake = lastFocusedIdRef.current !== current.earthquakeId;
    if (isNewEarthquake) {
      lastFocusedIdRef.current = current.earthquakeId;
      const point = projectEquirectangular(current.longitude, current.latitude);
      focusTargetRef.current = point;

      // Preview: frame BOTH the current and previous markers together
      // instead of only auto-focusing the current one, so the comparison is
      // visible without a manual pan/zoom step.
      const rect = container.getBoundingClientRect();
      if (isPreview && previous && !merged && rect.width >= 1 && rect.height >= 1) {
        const prevPoint = projectEquirectangular(previous.longitude, previous.latitude);
        panTo(
          fitPointsInSafeArea([point, prevPoint], { width: rect.width, height: rect.height }, insets, SAFE_MARGIN_PX + 30)
        );
      } else {
        focusOn(point.x, point.y, MAP_DEFAULT_FOCUS_ZOOM);
      }
      setSelected(null);
      return;
    }

    // Same earthquake: only re-check whether the side-rail/safe-area change
    // that triggered this pass now covers the already-focused marker.
    const target = focusTargetRef.current;
    if (!target) return;
    const rect = container.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return;

    const toOuter = (clientX: number, clientY: number) => {
      const ctm = svg.getScreenCTM();
      if (!ctm) return { x: 0, y: 0 };
      return new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
    };

    const left = rect.left + insets.left + SAFE_MARGIN_PX;
    const right = rect.right - insets.right - SAFE_MARGIN_PX;
    const top = rect.top + insets.top + SAFE_MARGIN_PX;
    const bottom = rect.bottom - insets.bottom - SAFE_MARGIN_PX;
    if (right <= left || bottom <= top) return;

    const topLeft = toOuter(left, top);
    const bottomRight = toOuter(right, bottom);
    const viewport = { width: rect.width, height: rect.height };
    // Read the synchronous ref, not the `camera` closure: this effect can
    // run again immediately (e.g. Strict Mode's dev-only double effect
    // invocation) before a just-scheduled focus has actually committed
    // through React, and using the stale closure would clobber it.
    const latestCamera = getLatestCamera();
    const targetOuter = baseToViewport(latestCamera, viewport, target.x, target.y);
    const within =
      targetOuter.x >= topLeft.x && targetOuter.x <= bottomRight.x && targetOuter.y >= topLeft.y && targetOuter.y <= bottomRight.y;
    if (within) return;

    const centerOuter = { x: (topLeft.x + bottomRight.x) / 2, y: (topLeft.y + bottomRight.y) / 2 };
    panTo(recenterForViewportTarget(latestCamera.k, target.x, target.y, centerOuter.x, centerOuter.y, viewport));
    // focusOn/panTo are stable (useCallback); current/insets/isPreview are the
    // triggers. previous/merged intentionally excluded — they change in lockstep
    // with `current` (both derive from the same `state`), same as `current`
    // itself only being tracked by `.earthquakeId` above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.earthquakeId, insets.top, insets.right, insets.bottom, insets.left, isPreview]);

  const currentPoint = current ? projectEquirectangular(current.longitude, current.latitude) : null;
  const previousPoint = previous && !merged ? projectEquirectangular(previous.longitude, previous.latitude) : null;

  function focusCurrent() {
    if (!current) return;
    const point = projectEquirectangular(current.longitude, current.latitude);
    focusTargetRef.current = point;
    focusOn(point.x, point.y, MAP_DEFAULT_FOCUS_ZOOM);
    setSelected("current");
  }

  function focusPrevious() {
    if (!previous) return;
    const point = projectEquirectangular(previous.longitude, previous.latitude);
    focusOn(point.x, point.y, MAP_DEFAULT_FOCUS_ZOOM);
    setSelected("previous");
  }

  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties>({ display: "none" });

  const popoverData: MapPopoverData | null = (() => {
    if (selected === "current" && current) {
      return {
        kind: merged ? "merged" : "current",
        magnitude: current.magnitude,
        place: current.place,
        depthKm: current.depthKm,
        latitude: current.latitude,
        longitude: current.longitude,
        observedAt: current.observedAt,
        recordDate: current.recordDate,
        previousRecordDate: merged && previous ? previous.recordDate : undefined,
        sourceUrl: current.sourceUrl,
      };
    }
    if (selected === "previous" && previous) {
      return {
        kind: "previous",
        magnitude: previous.magnitude,
        place: previous.place,
        depthKm: previous.depthKm,
        latitude: previous.latitude,
        longitude: previous.longitude,
        observedAt: previous.observedAt,
        recordDate: previous.recordDate,
        sourceUrl: previous.sourceUrl,
      };
    }
    return null;
  })();

  const popoverAnchor =
    selected === "current" && currentPoint ? currentPoint : selected === "previous" && previous ? projectEquirectangular(previous.longitude, previous.latitude) : null;

  // Positions the popover in real DOM pixels from the marker's current
  // projected point — recomputed after every render (camera/selection/safe
  // area change) inside an effect, never read from refs during render itself.
  useLayoutEffect(() => {
    const anchor = popoverAnchor;
    const svg = svgRef.current;
    const container = containerRef.current;
    if (!anchor || !svg || !container) {
      setPopoverStyle((prev) => (prev.display === "none" ? prev : { display: "none" }));
      return;
    }
    const ctm = svg.getScreenCTM();
    if (!ctm) return;
    const containerRect = container.getBoundingClientRect();
    const outer = baseToViewport(camera, { width: containerRect.width, height: containerRect.height }, anchor.x, anchor.y);
    const screenPt = new DOMPoint(outer.x, outer.y).matrixTransform(ctm);
    const markerX = screenPt.x - containerRect.left;
    const markerY = screenPt.y - containerRect.top;
    // Sit beside the marker with a clear gap so its center and rings stay
    // visible; flip to the left when the right side would run under a panel
    // or off the map, then clamp inside the safe area either way.
    const GAP = 22;
    const popW = 292;
    const popH = 270;
    const minLeft = insets.left + 8;
    const maxLeft = containerRect.width - insets.right - popW - 8;
    const minTop = insets.top + 8;
    const maxTop = containerRect.height - insets.bottom - popH - 8;
    let left = markerX + GAP;
    if (left > maxLeft) left = markerX - GAP - popW;
    let top = markerY - 28;
    if (maxLeft > minLeft) left = Math.min(Math.max(left, minLeft), maxLeft);
    if (maxTop > minTop) top = Math.min(Math.max(top, minTop), maxTop);
    setPopoverStyle((prev) => (prev.left === left && prev.top === top ? prev : { left, top }));
    // Depend on primitive values only — `popoverAnchor`/`camera` are new
    // object literals every render, which would otherwise re-trigger this
    // effect (and its setState) every single render and never settle.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popoverAnchor?.x, popoverAnchor?.y, camera.cx, camera.cy, camera.k, insets.left, insets.right, insets.top, insets.bottom]);

  const controlsStyle: React.CSSProperties = {
    right: insets.right + 14,
    top: insets.top + 14,
  };

  const renderTransform = computeRenderTransform(camera, viewportSize);
  const mapGroupTransform = `translate(${renderTransform.tx} ${renderTransform.ty}) scale(${renderTransform.scale})`;
  // Before the ResizeObserver in useMapCamera reports the SVG's real pixel
  // size, `viewportSize` is still {0,0} and `renderTransform.scale` falls
  // back to a near-zero value — markers counter-scale by `1/k`, so drawing
  // one against that degenerate scale would render it ~1000x too big for a
  // frame. See the comment at the marker JSX below for the full story.
  const hasMeasuredViewport = viewportSize.width >= 1 && viewportSize.height >= 1;

  // Where a marker's label should sit so it never gets clipped by the map
  // edge or tucked under a rail/dock — pure math on state, no DOM reads.
  function labelPlacement(point: { x: number; y: number }): { side: LabelSide; align: LabelAlign } {
    if (viewportSize.width < 1) return { side: "below", align: "center" };
    const v = baseToViewport(camera, viewportSize, point.x, point.y);
    const side: LabelSide = v.y > viewportSize.height - insets.bottom - 72 ? "above" : "below";
    const align: LabelAlign =
      v.x < insets.left + 120 ? "start" : v.x > viewportSize.width - insets.right - 120 ? "end" : "center";
    return { side, align };
  }
  const currentLabel = currentPoint ? labelPlacement(currentPoint) : null;
  const previousLabel = previousPoint ? labelPlacement(previousPoint) : null;

  return (
    <div ref={containerRef} className="relative h-full w-full">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${viewportSize.width || 1} ${viewportSize.height || 1}`}
        preserveAspectRatio="xMidYMid meet"
        className="h-full w-full touch-none select-none active:cursor-grabbing"
        style={{ cursor: "grab" }}
        role="application"
        aria-label={
          current
            ? `세계지도. ${current.place} 부근에 최근 24시간 최대 규모 지진 위치가 표시되어 있습니다. 마우스 휠로 확대·축소, 드래그로 이동할 수 있습니다.`
            : "세계지도. 표시할 지진 위치 정보가 아직 없습니다."
        }
        {...handlers}
        onClick={() => {
          if (!wasDrag()) setSelected(null);
        }}
      >
        {/* Ocean-colored backstop covering the FULL viewport, outside the
            pan/zoom transform — guarantees no white/mismatched background
            can ever show through, even briefly, regardless of where the
            transformed world content currently sits. */}
        <rect x={0} y={0} width={viewportSize.width} height={viewportSize.height} className="aw-map-ocean" />

        <g
          style={{ transition: isAnimating ? "transform 650ms cubic-bezier(0.22,1,0.36,1)" : "none" }}
          transform={mapGroupTransform}
        >
          <g className="aw-map-grid" strokeWidth={0.75} vectorEffect="non-scaling-stroke">
            {GRID_LONGITUDES.map((lon) => {
              const { x } = projectEquirectangular(lon, 0);
              return <line key={`lon-${lon}`} x1={x} y1={0} x2={x} y2={MAP_VIEWBOX_HEIGHT} vectorEffect="non-scaling-stroke" />;
            })}
            {GRID_LATITUDES.map((lat) => {
              const { y } = projectEquirectangular(0, lat);
              return <line key={`lat-${lat}`} x1={0} y1={y} x2={MAP_VIEWBOX_WIDTH} y2={y} vectorEffect="non-scaling-stroke" />;
            })}
            <line
              x1={0}
              y1={MAP_VIEWBOX_HEIGHT / 2}
              x2={MAP_VIEWBOX_WIDTH}
              y2={MAP_VIEWBOX_HEIGHT / 2}
              className="aw-map-equator"
              vectorEffect="non-scaling-stroke"
            />
          </g>

          <path d={WORLD_LAND_PATH_D} className="aw-map-land" strokeWidth={0.7} vectorEffect="non-scaling-stroke" />

          {/* Markers counter-scale by `1/k` (see MapMarker) to stay a
              constant SCREEN size at any zoom — but before the SVG's real
              pixel size has been measured (viewportSize still {0,0} on the
              very first paint, e.g. right after a hard refresh),
              `renderTransform.scale` degrades to a near-zero fallback
              (`fitScale` against a clamped 1x1 viewport), making `1/k`
              explode to ~1000x. That one bad frame rendered the current
              marker's brand-orange core/rings blown up to cover most of the
              screen — a visible orange flash on reload. Markers simply don't
              render until a real measurement exists; the land/grid group
              doesn't have this problem since it has no counter-scale. */}
          {hasMeasuredViewport && previousPoint && previous && (
            <MapMarker
              variant="previous"
              x={previousPoint.x}
              y={previousPoint.y}
              k={renderTransform.scale}
              magnitude={previous.magnitude}
              status="fresh"
              isLoading={false}
              selected={selected === "previous"}
              onSelect={() => setSelected((s) => (s === "previous" ? null : "previous"))}
              label="직전 기록"
              ariaLabel={`직전 KST 일별 기록, ${previous.place}, 규모 ${formatMagnitude(previous.magnitude)}. 정보 보기`}
              labelSide={previousLabel?.side}
              labelAlign={previousLabel?.align}
            />
          )}

          {hasMeasuredViewport && currentPoint && current && (
            <MapMarker
              variant={merged ? "merged" : "current"}
              x={currentPoint.x}
              y={currentPoint.y}
              k={renderTransform.scale}
              magnitude={current.magnitude}
              status={state.status}
              isLoading={isLoading}
              selected={selected === "current"}
              onSelect={() => setSelected((s) => (s === "current" ? null : "current"))}
              label={merged ? "현재·직전 동일" : "현재 최대"}
              ariaLabel={`현재 최근 24시간 최대 지진, ${current.place}, 규모 ${formatMagnitude(current.magnitude)}${
                merged ? ", 직전 KST 일별 기록과 동일한 지진입니다" : ""
              }. 정보 보기`}
              labelSide={currentLabel?.side}
              labelAlign={currentLabel?.align}
            />
          )}
        </g>

        {!current && state.status === "error" && (
          <text x={viewportSize.width / 2} y={viewportSize.height / 2} textAnchor="middle" className="text-[13px]" style={{ fill: "var(--ink-1)" }}>
            위치를 표시할 실제 정상값이 아직 없습니다.
          </text>
        )}
      </svg>

      {popoverData && popoverAnchor && (
        <MapPopover data={popoverData} style={popoverStyle} onClose={() => setSelected(null)} />
      )}

      <MapControls
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFocusCurrent={focusCurrent}
        onFocusPrevious={previous ? focusPrevious : undefined}
        onReset={reset}
        hasPrevious={!!previous && !merged}
        canZoomIn={camera.k < MAP_MAX_ZOOM - 1e-6}
        canZoomOut={camera.k > MAP_MIN_ZOOM + 1e-6}
        style={controlsStyle}
      />

      <div className="aw-map-legend aw-annotation" style={{ left: insets.left + 14, top: insets.top + 14 }} aria-hidden>
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <circle cx="7" cy="7" r="6" fill="none" style={{ stroke: "var(--marker-current)", strokeWidth: 1, opacity: 0.45 }} />
            <circle cx="7" cy="7" r="3.5" fill="none" style={{ stroke: "var(--marker-current)", strokeWidth: 1.2, opacity: 0.8 }} />
            <circle cx="7" cy="7" r="1.8" style={{ fill: "var(--marker-current)" }} />
          </svg>
          {isPreview ? "합성 현재 기록" : "현재 최대 지진 (파동)"}
        </span>
        <span className="flex items-center gap-2">
          <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
            <rect
              x="3.5"
              y="3.5"
              width="7"
              height="7"
              rx="1.5"
              transform="rotate(45 7 7)"
              style={{ fill: "var(--marker-halo)", stroke: "var(--marker-previous)", strokeWidth: 1.4 }}
            />
            <rect x="5.7" y="5.7" width="2.6" height="2.6" transform="rotate(45 7 7)" style={{ fill: "var(--marker-previous)" }} />
          </svg>
          {isPreview ? "합성 직전 기록" : "직전 일별 기록 (정적)"}
        </span>
      </div>

      {isPreview && (
        <div
          className="aw-annotation absolute flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold"
          style={{ left: "50%", top: insets.top + 14, transform: "translateX(-50%)", color: "var(--marker-previous)" }}
          aria-hidden
        >
          합성 데이터 미리보기
        </div>
      )}
    </div>
  );
}
