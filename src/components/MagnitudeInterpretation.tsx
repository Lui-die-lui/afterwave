"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAGNITUDE_LOG_SCALE_NOTE,
  MAGNITUDE_VS_INTENSITY_NOTE,
  getMagnitudeGuide,
  getMmiSummary,
  type MagnitudeTone,
} from "@/lib/magnitudeGuide";
import { IconInfo, IconX } from "./icons";

const TONE_COLOR: Record<MagnitudeTone, string> = {
  minimal: "var(--tone-minimal)",
  low: "var(--tone-low)",
  moderate: "var(--tone-moderate)",
  high: "var(--tone-high)",
  extreme: "var(--tone-extreme)",
};

export function MagnitudeInterpretation({ magnitude, mmiMax }: { magnitude: number; mmiMax: number | null }) {
  const guide = getMagnitudeGuide(magnitude);
  const mmi = getMmiSummary(mmiMax);
  const [showInfo, setShowInfo] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);
  const color = TONE_COLOR[guide.tone];

  useEffect(() => {
    if (!showInfo) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setShowInfo(false);
    }
    function onPointerDown(e: PointerEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) setShowInfo(false);
    }
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [showInfo]);

  return (
    <div className="flex flex-col gap-1">
      <div className="relative flex flex-wrap items-center gap-2" ref={popoverRef}>
        <span
          className="inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold"
          style={{
            color,
            background: `color-mix(in srgb, ${color} 18%, transparent)`,
            border: `1px solid color-mix(in srgb, ${color} 45%, transparent)`,
          }}
        >
          {guide.level}
        </span>

        <button
          type="button"
          aria-expanded={showInfo}
          aria-controls="magnitude-info-popover"
          onClick={() => setShowInfo((v) => !v)}
          className="inline-flex h-6 w-6 items-center justify-center rounded-full text-[var(--ink-2)] hover:text-[var(--ink-0)]"
          aria-label="규모와 진도 차이 안내 열기"
        >
          <IconInfo className="h-4 w-4" aria-hidden />
        </button>

        {showInfo && (
          <div id="magnitude-info-popover" role="dialog" aria-label="규모와 진도 안내" className="info-popover left-0 top-8">
            <div className="mb-1 flex items-center justify-between gap-2">
              <p className="font-semibold text-[var(--ink-0)]">규모 vs 진도</p>
              <button
                type="button"
                onClick={() => setShowInfo(false)}
                aria-label="안내 닫기"
                className="rounded-full p-0.5 text-[var(--ink-2)] hover:text-[var(--ink-0)]"
              >
                <IconX className="h-3.5 w-3.5" aria-hidden />
              </button>
            </div>
            <p>{MAGNITUDE_VS_INTENSITY_NOTE}</p>
            <p className="mt-2">{MAGNITUDE_LOG_SCALE_NOTE}</p>
          </div>
        )}
      </div>

      <p className="text-sm font-medium leading-snug text-[var(--ink-0)]">{guide.summary}</p>
      <p className="text-xs leading-snug text-[var(--ink-2)]">실제 흔들림은 거리·깊이·지반·건물에 따라 달라집니다.</p>

      <div
        className="magnitude-ladder"
        role="img"
        aria-label={`규모 심각도 7단계 중 ${guide.ladderIndex}단계: ${guide.level}`}
      >
        {Array.from({ length: guide.ladderTotal }).map((_, i) => {
          const active = i < guide.ladderIndex;
          return (
            <span
              key={i}
              className="magnitude-ladder-step"
              data-active={active}
              style={active ? ({ "--step-color": color } as React.CSSProperties) : undefined}
            />
          );
        })}
      </div>

      <p className="text-xs text-[var(--ink-1)]">
        {mmi.available ? (
          <>
            USGS 최대 추정 진도: <span className="font-medium text-[var(--ink-0)]">{mmi.text}</span>
          </>
        ) : (
          mmi.text
        )}
      </p>
    </div>
  );
}
