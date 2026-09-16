import { useEffect, useState } from "react";
import type { BoardStatus } from "@/lib/types";

const STATUS_COLOR: Record<BoardStatus, string> = {
  fresh: "var(--marker-current)",
  stale: "var(--status-stale)",
  error: "var(--status-error)",
  waiting: "var(--marker-current)",
};

/** Ring radii in screen px (diameters ≈ 32 / 50 / 70 before the animated scale). */
const RING_RADII = [16, 25, 35];
const HALO_WIDTH = 3;
const TICK_INNER_GAP = 4;
const TICK_LENGTH = 5;

/**
 * The current epicenter glyph, drawn at the origin of an already-positioned,
 * zoom-counter-scaled marker group: three expanding rings, four ticks, an
 * ivory halo and a solid brand-colored core that never fades. `coreRadius`
 * comes from magnitude (10–14px diameter). Status drives the color and
 * whether the rings animate (stale = static, dashed).
 */
export function EarthquakeRipple({
  coreRadius,
  status,
  isLoading,
}: {
  coreRadius: number;
  status: BoardStatus;
  isLoading: boolean;
}) {
  // "Adjusting state when a prop changes" pattern (react.dev) — detects a
  // stale/error -> fresh transition (recovery) during render, without a ref
  // read at render time or an effect that mirrors a prop into state.
  const [prevStatus, setPrevStatus] = useState(status);
  const [justRecovered, setJustRecovered] = useState(false);
  if (status !== prevStatus) {
    setPrevStatus(status);
    if (prevStatus !== "fresh" && status === "fresh") {
      setJustRecovered(true);
    }
  }

  useEffect(() => {
    if (!justRecovered) return;
    const timer = setTimeout(() => setJustRecovered(false), 1300);
    return () => clearTimeout(timer);
  }, [justRecovered]);

  const tickStart = coreRadius + HALO_WIDTH + TICK_INNER_GAP;
  const tickEnd = tickStart + TICK_LENGTH;

  return (
    <g
      data-status={status}
      data-loading={isLoading ? "true" : "false"}
      data-recovered={justRecovered ? "true" : "false"}
      className="eq-ripple"
      style={{ "--eq-color": STATUS_COLOR[status] } as React.CSSProperties}
    >
      {RING_RADII.map((r, i) => (
        <circle key={r} className="eq-ripple-ring" r={r} style={{ "--ring-delay": `${i * 0.7}s` } as React.CSSProperties} />
      ))}
      <g className="eq-ripple-ticks">
        <line className="eq-ripple-tick" x1={0} y1={-tickStart} x2={0} y2={-tickEnd} />
        <line className="eq-ripple-tick" x1={0} y1={tickStart} x2={0} y2={tickEnd} />
        <line className="eq-ripple-tick" x1={-tickStart} y1={0} x2={-tickEnd} y2={0} />
        <line className="eq-ripple-tick" x1={tickStart} y1={0} x2={tickEnd} y2={0} />
      </g>
      <circle className="eq-ripple-halo" r={coreRadius + HALO_WIDTH} />
      <circle className="eq-ripple-core" r={coreRadius} />
    </g>
  );
}
