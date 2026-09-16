"use client";

import { useEffect, useRef, useState } from "react";

export interface SafeAreaInsets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

const ZERO: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

/**
 * Measures, in real pixels relative to the map container, how much of it is
 * currently covered by the header, the failure-lab dock, and each open side
 * rail — the map itself never resizes (it's a full-bleed background layer),
 * so this is the only way to know where markers/controls/popovers actually
 * have room. Re-measures on any relevant element's resize (rail collapse,
 * window resize, breakpoint changes) via ResizeObserver.
 */
export function useMapSafeArea(containerRef: React.RefObject<HTMLElement | null>) {
  const [insets, setInsets] = useState<SafeAreaInsets>(ZERO);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function measure() {
      const c = containerRef.current;
      if (!c) return;
      const cRect = c.getBoundingClientRect();
      const header = document.getElementById("aw-header");
      const dock = document.getElementById("aw-dock");
      const leftRail = document.getElementById("left-rail");
      const rightRail = document.getElementById("right-rail");
      // A collapsed rail/dock is 0-sized, but its viewport-edge tab still
      // covers a sliver of the map — count whichever of the two reaches
      // further in.
      const leftTab = document.getElementById("left-rail-tab");
      const rightTab = document.getElementById("right-rail-tab");
      const dockTab = document.getElementById("aw-dock-tab");

      const clamp = (n: number, max: number) => Math.min(Math.max(n, 0), Math.max(max, 0));
      const visibleRect = (el: HTMLElement | null) => {
        if (!el) return null;
        const r = el.getBoundingClientRect();
        return r.width > 0 && r.height > 0 ? r : null;
      };

      const headerRect = header?.getBoundingClientRect();
      const dockRect = visibleRect(dock);
      const leftRect = visibleRect(leftRail);
      const rightRect = visibleRect(rightRail);
      const leftTabRect = visibleRect(leftTab);
      const rightTabRect = visibleRect(rightTab);
      const dockTabRect = visibleRect(dockTab);

      const top = headerRect ? clamp(headerRect.bottom - cRect.top, cRect.height) : 0;
      const bottomEdge = Math.min(dockRect?.top ?? Infinity, dockTabRect?.top ?? Infinity);
      const bottom = Number.isFinite(bottomEdge) ? clamp(cRect.bottom - bottomEdge, cRect.height) : 0;
      const leftEdge = Math.max(leftRect?.right ?? -Infinity, leftTabRect?.right ?? -Infinity);
      const rightEdge = Math.min(rightRect?.left ?? Infinity, rightTabRect?.left ?? Infinity);
      const left = Number.isFinite(leftEdge) ? clamp(leftEdge - cRect.left, cRect.width) : 0;
      const right = Number.isFinite(rightEdge) ? clamp(cRect.right - rightEdge, cRect.width) : 0;

      setInsets((prev) => {
        if (prev.top === top && prev.right === right && prev.bottom === bottom && prev.left === left) return prev;
        return { top, right, bottom, left };
      });
    }

    function scheduleMeasure() {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(measure);
    }

    scheduleMeasure();

    const observed = [
      container,
      document.getElementById("aw-header"),
      document.getElementById("aw-dock"),
      document.getElementById("left-rail"),
      document.getElementById("right-rail"),
      document.getElementById("left-rail-tab"),
      document.getElementById("right-rail-tab"),
      document.getElementById("aw-dock-tab"),
    ].filter((el): el is HTMLElement => !!el);
    const ro = new ResizeObserver(scheduleMeasure);
    observed.forEach((el) => ro.observe(el));
    window.addEventListener("resize", scheduleMeasure);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", scheduleMeasure);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [containerRef]);

  return insets;
}
