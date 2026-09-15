import { useEffect, useState } from "react";
import { getRippleGeometry, getToneOpacity, type MagnitudeTone, type RippleSizeTier } from "@/lib/magnitudeGuide";
import type { BoardStatus } from "@/lib/types";

const STATUS_COLOR: Record<BoardStatus, string> = {
  fresh: "#38bdf8",
  stale: "#fb923c",
  error: "#fb7185",
  waiting: "#38bdf8",
};

export function EarthquakeRipple({
  cx,
  cy,
  magnitude,
  tier,
  tone,
  status,
  isLoading,
}: {
  cx: number;
  cy: number;
  magnitude: number;
  tier: RippleSizeTier;
  tone: MagnitudeTone;
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
    const timer = setTimeout(() => setJustRecovered(false), 1500);
    return () => clearTimeout(timer);
  }, [justRecovered]);

  const geometry = getRippleGeometry(tier);
  const toneOpacity = getToneOpacity(tone);
  const color = STATUS_COLOR[status];
  const rings = Array.from({ length: geometry.ringCount }, (_, i) => i);
  const spreadStep = geometry.maxRadius / (geometry.ringCount + 1);

  return (
    <g
      transform={`translate(${cx} ${cy})`}
      data-status={status}
      data-loading={isLoading ? "true" : "false"}
      data-recovered={justRecovered ? "true" : "false"}
      className="eq-ripple"
      style={
        {
          "--eq-color": color,
          "--eq-tone-opacity": toneOpacity,
          "--eq-max-radius": `${geometry.maxRadius}px`,
        } as React.CSSProperties
      }
    >
      <circle className="eq-ripple-glow" r={geometry.maxRadius * 0.22} />
      {rings.map((i) => (
        <circle
          key={i}
          className="eq-ripple-ring"
          r={spreadStep * (i + 1)}
          style={{ "--ring-delay": `${i * 0.55}s`, "--ring-max-scale": (geometry.maxRadius / (spreadStep * (i + 1))).toFixed(2) } as React.CSSProperties}
        />
      ))}
      <circle className="eq-ripple-core" r={magnitude >= 7 ? 5 : magnitude >= 5 ? 4.2 : 3.4} />
    </g>
  );
}
