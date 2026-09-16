"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  DEFAULT_CAMERA,
  MAP_DEFAULT_FOCUS_ZOOM,
  MAP_FOCUS_TRANSITION_MS,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  clampCameraToViewport,
  clampZoom,
  focusCamera,
  panByViewportDelta,
  zoomAroundViewportPoint,
  type MapCamera,
  type ViewportSize,
} from "@/lib/mapCamera";

const DRAG_CLICK_THRESHOLD_PX = 5;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Client (page) coordinates -> viewport-pixel space (the svg's own user-space, since its viewBox is kept sized to match its rendered pixel box 1:1). Still goes through the real CTM rather than a manual `rect.left`/`rect.top` subtraction, so it stays correct under any DPR/CSS-transform edge case. */
function screenToViewport(svg: SVGSVGElement, clientX: number, clientY: number): { x: number; y: number } {
  const ctm = svg.getScreenCTM();
  if (!ctm) return { x: 0, y: 0 };
  const pt = new DOMPoint(clientX, clientY).matrixTransform(ctm.inverse());
  return { x: pt.x, y: pt.y };
}

function getViewportSize(svg: SVGSVGElement): ViewportSize {
  const rect = svg.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

interface ActivePointer {
  x: number;
  y: number;
}

/**
 * Owns the map's pan/zoom camera and wires up wheel/drag/pinch interaction
 * on a given SVG element. Deliberately hand-rolled (no d3-zoom dependency):
 * the projection is a plain equirectangular formula, so a single
 * `translate(...) scale(k)` on one <g>, driven by pointer/wheel math against
 * the SVG's own screen CTM, is all that's needed. Every camera update is
 * bounds-clamped in `mapCamera.ts` against the SVG's current pixel size, so
 * the world can never be panned/zoomed to expose empty space beyond its own
 * edges, and re-clamps automatically whenever that size changes (rail
 * toggle, window resize) via the ResizeObserver below.
 *
 * `cameraRef` (not the `camera` state/closure) is the single synchronous
 * source of truth every internal update reads its "previous" value from —
 * `camera` state exists only to trigger re-renders. A closure over `camera`
 * captured in a React effect can still be reading last render's value when
 * that effect runs again immediately (e.g. Strict Mode's dev-only double
 * invocation, or two effects from the same commit interacting); reading
 * `cameraRef.current` instead is always up to the moment.
 */
export function useMapCamera(svgRef: React.RefObject<SVGSVGElement | null>) {
  const [camera, setCameraState] = useState<MapCamera>(DEFAULT_CAMERA);
  const [viewportSize, setViewportSize] = useState<ViewportSize>({ width: 0, height: 0 });
  const [isAnimating, setIsAnimating] = useState(false);
  const [userInteracted, setUserInteracted] = useState(false);

  const cameraRef = useRef<MapCamera>(DEFAULT_CAMERA);
  /** Writes the ref synchronously, then schedules the matching re-render. */
  const commitCamera = useCallback((next: MapCamera) => {
    cameraRef.current = next;
    setCameraState(next);
  }, []);

  const pointers = useRef<Map<number, ActivePointer>>(new Map());
  const dragDistanceRef = useRef(0);
  const pinchStartDistRef = useRef<number | null>(null);
  const pinchStartKRef = useRef(1);
  const animTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const justDraggedRef = useRef(false);

  // Track the SVG's rendered pixel size (its viewBox is kept matched to it
  // 1:1 by the caller) and re-clamp the camera whenever it changes — rail
  // collapse/expand, window resize — so bounds are always evaluated against
  // the CURRENT viewport, never a stale one.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const ro = new ResizeObserver(() => {
      const size = getViewportSize(svg);
      if (size.width < 1 || size.height < 1) return;
      setViewportSize((prev) => (prev.width === size.width && prev.height === size.height ? prev : size));
      commitCamera(clampCameraToViewport(cameraRef.current, size));
    });
    ro.observe(svg);
    return () => ro.disconnect();
  }, [svgRef, commitCamera]);

  const animateTo = useCallback(
    (next: MapCamera) => {
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      if (prefersReducedMotion()) {
        setIsAnimating(false);
        commitCamera(next);
        return;
      }
      setIsAnimating(true);
      commitCamera(next);
      animTimeoutRef.current = setTimeout(() => setIsAnimating(false), MAP_FOCUS_TRANSITION_MS);
    },
    [commitCamera]
  );

  useEffect(() => () => {
    if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
  }, []);

  const focusOn = useCallback(
    (x: number, y: number, zoom: number = MAP_DEFAULT_FOCUS_ZOOM, markInteracted = false) => {
      const svg = svgRef.current;
      if (!svg) return;
      animateTo(focusCamera(x, y, zoom, getViewportSize(svg)));
      if (markInteracted) setUserInteracted(true);
    },
    [animateTo, svgRef]
  );

  const reset = useCallback(() => {
    const svg = svgRef.current;
    animateTo(svg ? clampCameraToViewport(DEFAULT_CAMERA, getViewportSize(svg)) : DEFAULT_CAMERA);
    setUserInteracted(true);
  }, [animateTo, svgRef]);

  const zoomStep = useCallback(
    (factor: number) => {
      const svg = svgRef.current;
      if (!svg) return;
      const viewport = getViewportSize(svg);
      const center = { x: viewport.width / 2, y: viewport.height / 2 };
      setIsAnimating(true);
      commitCamera(zoomAroundViewportPoint(cameraRef.current, viewport, center.x, center.y, clampZoom(cameraRef.current.k * factor)));
      setUserInteracted(true);
      if (animTimeoutRef.current) clearTimeout(animTimeoutRef.current);
      animTimeoutRef.current = setTimeout(() => setIsAnimating(false), 220);
    },
    [svgRef, commitCamera]
  );

  const zoomIn = useCallback(() => zoomStep(1.5), [zoomStep]);
  const zoomOut = useCallback(() => zoomStep(1 / 1.5), [zoomStep]);

  // Wheel zoom + trackpad pinch (Chrome/Firefox/Safari synthesize wheel+ctrlKey
  // for a trackpad pinch). Attached as a native, non-passive listener because
  // React's onWheel is passive by default and can't preventDefault reliably.
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    function onWheel(e: WheelEvent) {
      e.preventDefault();
      if (!svg) return;
      const viewport = getViewportSize(svg);
      const { x, y } = screenToViewport(svg, e.clientX, e.clientY);
      const factor = Math.exp(-e.deltaY * 0.0018);
      commitCamera(zoomAroundViewportPoint(cameraRef.current, viewport, x, y, clampZoom(cameraRef.current.k * factor)));
      setIsAnimating(false);
      setUserInteracted(true);
    }
    svg.addEventListener("wheel", onWheel, { passive: false });
    return () => svg.removeEventListener("wheel", onWheel);
  }, [svgRef, commitCamera]);

  const onPointerDown = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    // Skip capture when the gesture starts on a marker: pointer capture
    // retargets the mouse-compatibility click event that follows to the
    // capturing element (the svg), so a marker's own onClick would never
    // fire and tapping it would look like nothing happened. Background
    // drags still capture, so a fast drag can't lose tracking off-canvas.
    const startedOnMarker = (e.target as Element | null)?.closest(".eq-marker") != null;
    if (!startedOnMarker) {
      (e.currentTarget as SVGSVGElement).setPointerCapture(e.pointerId);
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    dragDistanceRef.current = 0;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinchStartDistRef.current = Math.hypot(a.x - b.x, a.y - b.y);
      pinchStartKRef.current = cameraRef.current.k;
    }
  }, []);

  const onPointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      const svg = svgRef.current;
      if (!svg || !pointers.current.has(e.pointerId)) return;
      const prevPt = pointers.current.get(e.pointerId)!;
      const viewport = getViewportSize(svg);

      if (pointers.current.size >= 2) {
        pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
        const [a, b] = [...pointers.current.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const startDist = pinchStartDistRef.current;
        if (startDist && startDist > 1) {
          const midX = (a.x + b.x) / 2;
          const midY = (a.y + b.y) / 2;
          const mid = screenToViewport(svg, midX, midY);
          const nextK = clampZoom(pinchStartKRef.current * (dist / startDist));
          commitCamera(zoomAroundViewportPoint(cameraRef.current, viewport, mid.x, mid.y, nextK));
          setUserInteracted(true);
          setIsAnimating(false);
        }
        return;
      }

      const dx = e.clientX - prevPt.x;
      const dy = e.clientY - prevPt.y;
      dragDistanceRef.current += Math.hypot(dx, dy);
      pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

      const viewportPrev = screenToViewport(svg, prevPt.x, prevPt.y);
      const viewportNow = screenToViewport(svg, e.clientX, e.clientY);
      commitCamera(panByViewportDelta(cameraRef.current, viewport, viewportNow.x - viewportPrev.x, viewportNow.y - viewportPrev.y));
      setIsAnimating(false);
      if (dragDistanceRef.current > DRAG_CLICK_THRESHOLD_PX) {
        setUserInteracted(true);
        justDraggedRef.current = true;
      }
    },
    [svgRef, commitCamera]
  );

  const endPointer = useCallback((e: React.PointerEvent<SVGSVGElement>) => {
    pointers.current.delete(e.pointerId);
    pinchStartDistRef.current = null;
    if (pointers.current.size === 0 && dragDistanceRef.current > DRAG_CLICK_THRESHOLD_PX) {
      // Swallow the click that follows a real drag so releasing over a
      // marker doesn't also select it.
      setTimeout(() => {
        justDraggedRef.current = false;
      }, 0);
    } else {
      justDraggedRef.current = false;
    }
  }, []);

  const wasDrag = useCallback(() => justDraggedRef.current, []);

  const handlers = useMemo(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
    }),
    [onPointerDown, onPointerMove, endPointer]
  );

  const getLatestCamera = useCallback(() => cameraRef.current, []);

  return {
    camera,
    getLatestCamera,
    viewportSize,
    isAnimating,
    userInteracted,
    setUserInteracted,
    focusOn,
    panTo: animateTo,
    reset,
    zoomIn,
    zoomOut,
    handlers,
    wasDrag,
    minZoom: MAP_MIN_ZOOM,
    maxZoom: MAP_MAX_ZOOM,
  };
}
