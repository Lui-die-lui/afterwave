import { MAP_VIEWBOX_HEIGHT, MAP_VIEWBOX_WIDTH } from "./projection";

/**
 * The map "camera" is a center point (in the SAME base 1000x500 projection
 * space as `projectEquirectangular`) plus a zoom factor `k >= 1`, where
 * `k = 1` means "the whole world fits the current viewport" (see
 * `fitScale`). The actual on-screen `translate(tx,ty) scale(s)` is derived
 * fresh from `(camera, viewport)` on every render/interaction by
 * `computeRenderTransform` — the ONLY place pan/zoom bounds are enforced —
 * so the map can never be panned or zoomed to expose empty space beyond its
 * own edges, at any viewport size or aspect ratio.
 */
export interface MapCamera {
  cx: number;
  cy: number;
  k: number;
}

export interface ViewportSize {
  width: number;
  height: number;
}

export const MAP_MIN_ZOOM = 1;
export const MAP_MAX_ZOOM = 7;
export const MAP_DEFAULT_FOCUS_ZOOM = 2.6;
export const MAP_FOCUS_TRANSITION_MS = 650;

/** The world's own base unit size — unrelated to any viewport pixel size. */
const W = MAP_VIEWBOX_WIDTH;
const H = MAP_VIEWBOX_HEIGHT;

export const DEFAULT_CAMERA: MapCamera = { cx: W / 2, cy: H / 2, k: MAP_MIN_ZOOM };

export function clampZoom(k: number): number {
  return Math.min(MAP_MAX_ZOOM, Math.max(MAP_MIN_ZOOM, k));
}

function safeViewport(viewport: ViewportSize): ViewportSize {
  return { width: Math.max(1, viewport.width), height: Math.max(1, viewport.height) };
}

/** Scale that fits the whole world inside the viewport with no cropping (may letterbox one axis). */
export function fitScale(viewport: ViewportSize): number {
  const v = safeViewport(viewport);
  return Math.min(v.width / W, v.height / H);
}

/** Scale that fully covers the viewport with the world, cropping whichever axis is relatively narrower. */
export function coverScale(viewport: ViewportSize): number {
  const v = safeViewport(viewport);
  return Math.max(v.width / W, v.height / H);
}

export interface RenderTransform {
  tx: number;
  ty: number;
  scale: number;
}

/**
 * Turns a camera + current viewport size into the actual `translate(tx,ty)
 * scale(s)` to render, enforcing the pan/zoom bounds per axis:
 *  - scaled map bigger than the viewport: translate clamped to
 *    [viewport - scaledMap, 0] (can pan, but never past an edge).
 *  - scaled map smaller than/equal to the viewport (a letterboxed axis at
 *    low zoom): translate forced to exactly `(viewport - scaledMap) / 2` —
 *    that axis is never pannable, always centered.
 * `k` only zooms IN from `fitScale`, so the rendered map is never smaller
 * than a full "whole world" fit — there is always a floor that shows no
 * empty background, in the min-zoom / world-view case.
 */
export function computeRenderTransform(camera: MapCamera, viewport: ViewportSize): RenderTransform {
  const v = safeViewport(viewport);
  const scale = fitScale(v) * clampZoom(camera.k);
  const scaledW = W * scale;
  const scaledH = H * scale;

  let tx = v.width / 2 - scale * camera.cx;
  let ty = v.height / 2 - scale * camera.cy;

  tx = scaledW > v.width ? Math.max(v.width - scaledW, Math.min(0, tx)) : (v.width - scaledW) / 2;
  ty = scaledH > v.height ? Math.max(v.height - scaledH, Math.min(0, ty)) : (v.height - scaledH) / 2;

  return { tx, ty, scale };
}

/**
 * Re-derives (cx, cy) from the already-bounds-clamped render transform, so
 * the camera state itself never drifts past what's actually on screen —
 * repeatedly dragging past an edge just holds at the edge instead of
 * building up an off-screen offset that would "spring back" later.
 */
export function clampCameraToViewport(camera: MapCamera, viewport: ViewportSize): MapCamera {
  const k = clampZoom(camera.k);
  const v = safeViewport(viewport);
  const t = computeRenderTransform({ ...camera, k }, v);
  return {
    cx: (v.width / 2 - t.tx) / t.scale,
    cy: (v.height / 2 - t.ty) / t.scale,
    k,
  };
}

/** Base-space (world projection) point currently under a given viewport-pixel point. */
export function viewportPointToBase(camera: MapCamera, viewport: ViewportSize, px: number, py: number): { x: number; y: number } {
  const t = computeRenderTransform(camera, viewport);
  return { x: (px - t.tx) / t.scale, y: (py - t.ty) / t.scale };
}

/** Projects a base-space point through the camera into viewport-pixel space. */
export function baseToViewport(camera: MapCamera, viewport: ViewportSize, x: number, y: number): { x: number; y: number } {
  const t = computeRenderTransform(camera, viewport);
  return { x: t.tx + t.scale * x, y: t.ty + t.scale * y };
}

/**
 * Zoom to `nextK`, keeping the base-space point currently under the
 * viewport-pixel point (px, py) fixed on screen — the standard "zoom around
 * cursor" pivot — then clamps to the pan/zoom bounds. Near an edge, holding
 * the map in bounds takes priority over the pivot staying exact, same as
 * any bounded map UI.
 */
export function zoomAroundViewportPoint(camera: MapCamera, viewport: ViewportSize, px: number, py: number, nextK: number): MapCamera {
  const k = clampZoom(nextK);
  if (k === camera.k) return camera;
  const base = viewportPointToBase(camera, viewport, px, py);
  const scale = fitScale(viewport) * k;
  const cx = base.x - (px - viewport.width / 2) / scale;
  const cy = base.y - (py - viewport.height / 2) / scale;
  return clampCameraToViewport({ cx, cy, k }, viewport);
}

/** Pans so a base point that was under viewport-pixel (px1,py1) ends up under (px2,py2) — used for drag panning. Bounds-clamped on every call, so a fast/large drag delta can never punch through an edge. */
export function panByViewportDelta(camera: MapCamera, viewport: ViewportSize, dxPx: number, dyPx: number): MapCamera {
  const scale = fitScale(viewport) * clampZoom(camera.k);
  const cx = camera.cx - dxPx / scale;
  const cy = camera.cy - dyPx / scale;
  return clampCameraToViewport({ cx, cy, k: camera.k }, viewport);
}

/** Focuses the camera on a base-space point at a given zoom (auto-focus / "move to marker"), bounds-clamped. */
export function focusCamera(x: number, y: number, k: number, viewport: ViewportSize): MapCamera {
  return clampCameraToViewport({ cx: x, cy: y, k: clampZoom(k) }, viewport);
}

/**
 * Camera that frames every given base-space point at once, inside the
 * viewport's "safe" sub-rect (shrunk by `insets` — open side rails, header,
 * dock — plus a flat `margin`) — used by the preview scenario to keep both
 * the current and previous markers on screen together instead of only
 * auto-focusing the current one. Computes the zoom from how much of the
 * safe rect the points' bounding box needs, then hands off to
 * `recenterForViewportTarget` for the actual centering/clamp, so this gets
 * the exact same bounds safety as every other camera update.
 */
export function fitPointsInSafeArea(
  points: { x: number; y: number }[],
  viewport: ViewportSize,
  insets: { left: number; right: number; top: number; bottom: number },
  margin: number,
  maxZoom: number = MAP_MAX_ZOOM
): MapCamera {
  const v = safeViewport(viewport);
  if (points.length === 0) return clampCameraToViewport(DEFAULT_CAMERA, v);

  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const baseX = (Math.min(...xs) + Math.max(...xs)) / 2;
  const baseY = (Math.min(...ys) + Math.max(...ys)) / 2;
  const spanX = Math.max(Math.max(...xs) - Math.min(...xs), 1);
  const spanY = Math.max(Math.max(...ys) - Math.min(...ys), 1);

  const safeW = Math.max(v.width - insets.left - insets.right - margin * 2, 40);
  const safeH = Math.max(v.height - insets.top - insets.bottom - margin * 2, 40);

  const fit = fitScale(v);
  const k = clampZoom(Math.min(safeW / (spanX * fit), safeH / (spanY * fit), maxZoom));

  const targetPx = insets.left + margin + safeW / 2;
  const targetPy = insets.top + margin + safeH / 2;
  return recenterForViewportTarget(k, baseX, baseY, targetPx, targetPy, v);
}

/**
 * Adjusts the camera's center (keeping zoom fixed) so a given base-space
 * point lands at a specific viewport-pixel position — used to re-center a
 * currently-focused marker into the safe area after a side rail toggles.
 * Bounds-clamped like every other camera update.
 */
export function recenterForViewportTarget(
  k: number,
  baseX: number,
  baseY: number,
  targetPx: number,
  targetPy: number,
  viewport: ViewportSize
): MapCamera {
  const scale = fitScale(viewport) * clampZoom(k);
  const cx = baseX - (targetPx - viewport.width / 2) / scale;
  const cy = baseY - (targetPy - viewport.height / 2) / scale;
  return clampCameraToViewport({ cx, cy, k }, viewport);
}
