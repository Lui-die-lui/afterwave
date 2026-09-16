import { describe, expect, it } from "vitest";
import {
  DEFAULT_CAMERA,
  MAP_MAX_ZOOM,
  MAP_MIN_ZOOM,
  baseToViewport,
  clampCameraToViewport,
  clampZoom,
  computeRenderTransform,
  fitPointsInSafeArea,
  fitScale,
  focusCamera,
  panByViewportDelta,
  recenterForViewportTarget,
  viewportPointToBase,
  zoomAroundViewportPoint,
} from "../mapCamera";

const SQUARE_VIEWPORT = { width: 1000, height: 1000 }; // taller than the 2:1 world -> height letterboxed
const WIDE_VIEWPORT = { width: 2000, height: 400 }; // wider than 2:1 -> width would exceed at k=1... actually 2000/1000=2, 400/500=0.8 -> width is the binding (smaller ratio? no) let's just use it for a generic bigger-than-world case
const TALL_MOBILE_VIEWPORT = { width: 360, height: 640 };

describe("clampZoom", () => {
  it("keeps zoom within [MIN, MAX]", () => {
    expect(clampZoom(0.1)).toBe(MAP_MIN_ZOOM);
    expect(clampZoom(999)).toBe(MAP_MAX_ZOOM);
    expect(clampZoom(3)).toBe(3);
  });
});

describe("computeRenderTransform — no exposed empty background", () => {
  it("centers and letterboxes the shorter-relative axis at min zoom instead of leaving it free to pan", () => {
    // 1000x1000 viewport: width ratio 1000/1000=1, height ratio 1000/500=2 -> fitScale=1 (width-bound), height is the letterboxed axis.
    const t = computeRenderTransform(DEFAULT_CAMERA, SQUARE_VIEWPORT);
    expect(t.scale).toBeCloseTo(1, 6);
    expect(t.tx).toBeCloseTo(0, 6); // width exactly fills, no horizontal margin
    const scaledH = 500 * t.scale;
    expect(t.ty).toBeCloseTo((SQUARE_VIEWPORT.height - scaledH) / 2, 6); // vertical letterbox is centered
  });

  it("never lets a translate value expose empty space, on whichever axis actually overflows the viewport", () => {
    // At k=3 on this narrow/tall viewport, width overflows (pannable, clamped)
    // but height does not yet (still the letterboxed/centered axis) — assert
    // the correct rule per axis rather than assuming both overflow.
    const camera = { cx: 0, cy: 0, k: 3 }; // pushed hard toward the top-left corner of the world
    const t = computeRenderTransform(camera, TALL_MOBILE_VIEWPORT);
    const scaledW = 1000 * t.scale;
    const scaledH = 500 * t.scale;

    expect(scaledW).toBeGreaterThan(TALL_MOBILE_VIEWPORT.width);
    expect(t.tx).toBeLessThanOrEqual(0);
    expect(t.tx).toBeGreaterThanOrEqual(TALL_MOBILE_VIEWPORT.width - scaledW);

    expect(scaledH).toBeLessThanOrEqual(TALL_MOBILE_VIEWPORT.height);
    expect(t.ty).toBeCloseTo((TALL_MOBILE_VIEWPORT.height - scaledH) / 2, 6);
  });

  it("clamps BOTH axes once zoom is high enough that both overflow", () => {
    const camera = { cx: 0, cy: 0, k: MAP_MAX_ZOOM };
    const t = computeRenderTransform(camera, TALL_MOBILE_VIEWPORT);
    const scaledW = 1000 * t.scale;
    const scaledH = 500 * t.scale;
    expect(scaledW).toBeGreaterThan(TALL_MOBILE_VIEWPORT.width);
    expect(scaledH).toBeGreaterThan(TALL_MOBILE_VIEWPORT.height);
    expect(t.tx).toBeLessThanOrEqual(0);
    expect(t.tx).toBeGreaterThanOrEqual(TALL_MOBILE_VIEWPORT.width - scaledW);
    expect(t.ty).toBeLessThanOrEqual(0);
    expect(t.ty).toBeGreaterThanOrEqual(TALL_MOBILE_VIEWPORT.height - scaledH);
  });

  it("also holds at the opposite (bottom-right) extreme", () => {
    const camera = { cx: 1000, cy: 500, k: 4 };
    const t = computeRenderTransform(camera, WIDE_VIEWPORT);
    const scaledW = 1000 * t.scale;
    const scaledH = 500 * t.scale;
    expect(t.tx).toBeLessThanOrEqual(0.0001);
    expect(t.tx).toBeGreaterThanOrEqual(WIDE_VIEWPORT.width - scaledW - 0.0001);
    expect(t.ty).toBeLessThanOrEqual(0.0001);
    expect(t.ty).toBeGreaterThanOrEqual(WIDE_VIEWPORT.height - scaledH - 0.0001);
  });

  it("is idempotent through clampCameraToViewport (no drift on repeated out-of-bounds requests)", () => {
    const wildRequest = { cx: -99999, cy: 99999, k: 5 };
    const once = clampCameraToViewport(wildRequest, TALL_MOBILE_VIEWPORT);
    const twice = clampCameraToViewport(once, TALL_MOBILE_VIEWPORT);
    expect(twice).toEqual(once);
  });
});

describe("zoomAroundViewportPoint", () => {
  it("keeps the base-space point under the cursor fixed on screen after zooming, away from any edge", () => {
    const viewport = { width: 1600, height: 900 };
    const camera = { cx: 500, cy: 250, k: 2 };
    const cursorPx = { x: 900, y: 500 };
    const basePointUnderCursor = viewportPointToBase(camera, viewport, cursorPx.x, cursorPx.y);
    const next = zoomAroundViewportPoint(camera, viewport, cursorPx.x, cursorPx.y, 3);
    const after = baseToViewport(next, viewport, basePointUnderCursor.x, basePointUnderCursor.y);
    expect(after.x).toBeCloseTo(cursorPx.x, 4);
    expect(after.y).toBeCloseTo(cursorPx.y, 4);
    expect(next.k).toBe(3);
  });

  it("is a no-op when the target zoom equals the current zoom", () => {
    const viewport = { width: 1600, height: 900 };
    const camera = { cx: 500, cy: 250, k: 2 };
    expect(zoomAroundViewportPoint(camera, viewport, 400, 300, 2)).toEqual(camera);
  });

  it("never produces a translate that exposes empty background, even zooming out at an edge", () => {
    const viewport = { width: 1200, height: 700 };
    const camera = clampCameraToViewport({ cx: 0, cy: 500, k: 6 }, viewport);
    const next = zoomAroundViewportPoint(camera, viewport, 0, 0, 1.5);
    const t = computeRenderTransform(next, viewport);
    const scaledW = 1000 * t.scale;
    const scaledH = 500 * t.scale;
    expect(t.tx).toBeLessThanOrEqual(0.0001);
    expect(t.tx).toBeGreaterThanOrEqual(viewport.width - scaledW - 0.0001);
    expect(t.ty).toBeLessThanOrEqual(0.0001);
    expect(t.ty).toBeGreaterThanOrEqual(viewport.height - scaledH - 0.0001);
  });
});

describe("panByViewportDelta", () => {
  it("moves a fixed base point by the same screen delta it was dragged by, away from any edge", () => {
    const viewport = { width: 1600, height: 900 };
    const camera = { cx: 500, cy: 250, k: 3 };
    const basePoint = { x: 550, y: 260 };
    const before = baseToViewport(camera, viewport, basePoint.x, basePoint.y);
    const dx = 40;
    const dy = -15;
    const next = panByViewportDelta(camera, viewport, dx, dy);
    const after = baseToViewport(next, viewport, basePoint.x, basePoint.y);
    expect(after.x - before.x).toBeCloseTo(dx, 4);
    expect(after.y - before.y).toBeCloseTo(dy, 4);
  });

  it("a huge, fast drag delta still lands exactly on the bound, never past it", () => {
    const viewport = { width: 1200, height: 700 };
    const camera = clampCameraToViewport({ cx: 500, cy: 250, k: 4 }, viewport);
    const next = panByViewportDelta(camera, viewport, 999999, -999999);
    const t = computeRenderTransform(next, viewport);
    expect(t.tx).toBeCloseTo(0, 4); // dragged content fully to the right -> pinned at the left-bound (tx=0)
    const scaledH = 500 * t.scale;
    expect(t.ty).toBeCloseTo(viewport.height - scaledH, 4); // dragged content fully up -> pinned at the bottom bound
  });
});

describe("recenterForViewportTarget", () => {
  it("places a base point exactly at the requested viewport position without changing zoom, when that's within bounds", () => {
    const viewport = { width: 1600, height: 900 };
    const k = 4;
    const target = { x: 550, y: 260 };
    const desired = { x: 400, y: 300 };
    const camera = recenterForViewportTarget(k, target.x, target.y, desired.x, desired.y, viewport);
    expect(camera.k).toBe(k);
    const actual = baseToViewport(camera, viewport, target.x, target.y);
    expect(actual.x).toBeCloseTo(desired.x, 4);
    expect(actual.y).toBeCloseTo(desired.y, 4);
  });
});

describe("focusCamera", () => {
  it("centers the camera on the given point at the requested zoom, bounds-clamped", () => {
    const viewport = { width: 1600, height: 900 };
    const camera = focusCamera(600, 300, 2.6, viewport);
    expect(camera.k).toBe(2.6);
    const t = computeRenderTransform(camera, viewport);
    const projected = baseToViewport(camera, viewport, 600, 300);
    expect(projected.x).toBeCloseTo(viewport.width / 2, 4);
    expect(projected.y).toBeCloseTo(viewport.height / 2, 4);
    expect(t).toBeTruthy();
  });

  it("still clamps an out-of-range zoom request", () => {
    const viewport = { width: 1600, height: 900 };
    const camera = focusCamera(0, 0, 999, viewport);
    expect(camera.k).toBe(MAP_MAX_ZOOM);
  });

  it("clamps the final position so focusing near a pole/edge never exposes empty background", () => {
    const viewport = { width: 1600, height: 900 };
    const camera = focusCamera(0, 0, 2.6, viewport); // top-left corner of the world
    const t = computeRenderTransform(camera, viewport);
    expect(t.tx).toBeLessThanOrEqual(0.0001);
    expect(t.tx).toBeGreaterThanOrEqual(viewport.width - 1000 * t.scale - 0.0001);
  });
});

describe("fitPointsInSafeArea — daily comparison preview's dual-marker framing", () => {
  const NO_INSETS = { left: 0, right: 0, top: 0, bottom: 0 };

  it("both points land inside the safe (inset-shrunk) rect, not just the raw viewport", () => {
    const viewport = { width: 1400, height: 800 };
    const insets = { left: 320, right: 0, top: 60, bottom: 0 };
    const margin = 20;
    const a = { x: 300, y: 200 };
    const b = { x: 600, y: 300 };
    const camera = fitPointsInSafeArea([a, b], viewport, insets, margin);

    const pa = baseToViewport(camera, viewport, a.x, a.y);
    const pb = baseToViewport(camera, viewport, b.x, b.y);
    for (const p of [pa, pb]) {
      expect(p.x).toBeGreaterThanOrEqual(insets.left + margin - 0.5);
      expect(p.x).toBeLessThanOrEqual(viewport.width - insets.right - margin + 0.5);
      expect(p.y).toBeGreaterThanOrEqual(insets.top + margin - 0.5);
      expect(p.y).toBeLessThanOrEqual(viewport.height - insets.bottom - margin + 0.5);
    }
  });

  it("zooms in further for two nearby points than for two far-apart points", () => {
    const viewport = { width: 1400, height: 800 };
    const near = fitPointsInSafeArea(
      [{ x: 500, y: 250 }, { x: 520, y: 260 }],
      viewport,
      NO_INSETS,
      20
    );
    const far = fitPointsInSafeArea(
      [{ x: 50, y: 50 }, { x: 950, y: 450 }],
      viewport,
      NO_INSETS,
      20
    );
    expect(near.k).toBeGreaterThan(far.k);
  });

  it("never produces a translate that exposes empty background, on whichever axis overflows, for two points far apart", () => {
    // computeRenderTransform is the single place bounds are enforced (see
    // its own tests above) — this only checks fitPointsInSafeArea feeds it a
    // camera that respects the same per-axis rule, not exercising that rule
    // itself again.
    const viewport = { width: 1200, height: 700 };
    const camera = fitPointsInSafeArea(
      [{ x: 10, y: 10 }, { x: 990, y: 490 }],
      viewport,
      NO_INSETS,
      20
    );
    const t = computeRenderTransform(camera, viewport);
    const scaledW = 1000 * t.scale;
    const scaledH = 500 * t.scale;
    if (scaledW > viewport.width) {
      expect(t.tx).toBeLessThanOrEqual(0.0001);
      expect(t.tx).toBeGreaterThanOrEqual(viewport.width - scaledW - 0.0001);
    } else {
      expect(t.tx).toBeCloseTo((viewport.width - scaledW) / 2, 4);
    }
    if (scaledH > viewport.height) {
      expect(t.ty).toBeLessThanOrEqual(0.0001);
      expect(t.ty).toBeGreaterThanOrEqual(viewport.height - scaledH - 0.0001);
    } else {
      expect(t.ty).toBeCloseTo((viewport.height - scaledH) / 2, 4);
    }
  });

  it("respects maxZoom even when a single (degenerate) point is passed", () => {
    const viewport = { width: 1400, height: 800 };
    const camera = fitPointsInSafeArea([{ x: 500, y: 250 }], viewport, NO_INSETS, 20, 3);
    expect(camera.k).toBeLessThanOrEqual(3);
  });
});

describe("fitScale / DEFAULT_CAMERA", () => {
  it("DEFAULT_CAMERA starts at the world's full-view zoom", () => {
    expect(DEFAULT_CAMERA.k).toBe(MAP_MIN_ZOOM);
  });

  it("fitScale picks the tighter axis so the whole world is visible with no cropping", () => {
    expect(fitScale({ width: 1000, height: 1000 })).toBeCloseTo(1, 6); // width-bound
    expect(fitScale({ width: 4000, height: 500 })).toBeCloseTo(1, 6); // height-bound
  });
});
