"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { buildDailyComparisonPreview, type DailyComparisonPreview } from "@/lib/fixtures/dailyComparisonPreview";
import type { BoardState } from "@/lib/types";
import { FailureDock } from "./FailureDock";
import { Header } from "./Header";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { WorldMap } from "./map/WorldMap";
import type { PanelState } from "./SideRail";

const MAP_LEGEND_NOTE = "파동은 이해를 돕는 시각 효과이며 실제 흔들림 범위나 피해 지역을 의미하지 않습니다.";

// Container-expand duration and content-fade-in timing for the "opening"
// sequence — kept in sync with the CSS custom properties `--panel-expand` /
// `--content-fade-in` / `--content-fade-in-delay` in globals.css. The shell
// itself is allowed to slide open at a relaxed pace; the fade-in starts a
// bit before that finishes and is SHORT/snappy — content is fixed-width +
// clipped regardless of the shell's current width, so starting early can't
// reintroduce text reflow, and once it starts appearing it should reach
// full opacity fast rather than easing in slowly.
const PANEL_EXPAND_MS = 250;
const CONTENT_FADE_IN_DELAY_MS = 190;
const CONTENT_FADE_IN_MS = 60;
// Content-fade-out and container-collapse durations for the "closing"
// sequence (content first, then container) — kept in sync with
// `--content-fade-out` / `--panel-collapse`.
const CONTENT_FADE_OUT_MS = 80;
const PANEL_COLLAPSE_MS = 180;

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Drives a side rail through `closed -> opening -> open` and
 * `open -> closing -> closed`, matching the timed sequence CSS in
 * globals.css expects: on open the CONTAINER starts expanding immediately
 * and the content starts fading in shortly before that finishes (a small
 * deliberate overlap, so the panel isn't sitting empty for the whole
 * expand); on close the CONTENT fades out first and the container only
 * shrinks afterward. The intermediate "opening"/"closing" values exist
 * purely so `.aw-rail`'s CSS can keep content hidden (opacity 0 /
 * visibility hidden / pointer-events none) whenever it would otherwise sit
 * at a shrinking/growing width — content is never rendered at a width other
 * than its fixed, fully-open one, so text can never visibly reflow
 * mid-transition regardless of this overlap.
 *
 * Both renders start "open" (matching what the server sent, so there's no
 * hydration mismatch) and only correct themselves from localStorage after
 * mount — that correction is a direct, unanimated `setState("closed")`
 * (never through `toggle`), since it's restoring a prior preference before
 * the user has seen anything, not a user-initiated transition to animate.
 *
 * Every `toggle()` call clears any pending settle timer first and computes
 * the next state from whatever the CURRENT state is, so rapid repeated
 * clicks (including mid-transition) always interrupt cleanly into the
 * opposite direction instead of leaving a stale timer to fire later and
 * clobber a newer click.
 */
function useAnimatedRail(storageKey: string) {
  const [state, setState] = useState<PanelState>("open");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(storageKey) === "closed") setState("closed");
    } catch {
      // Private browsing / blocked storage: default to open for this visit.
    }
  }, [storageKey]);

  useEffect(
    () => () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    },
    []
  );

  const toggle = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setState((prev) => {
      const isOpenSide = prev === "open" || prev === "opening";
      const opening = !isOpenSide;
      try {
        localStorage.setItem(storageKey, opening ? "open" : "closed");
      } catch {
        // ignore
      }

      if (prefersReducedMotion()) {
        return opening ? "open" : "closed";
      }

      // Opening settles whenever the SLOWER of the two overlapping
      // transitions finishes (expand vs. delayed fade-in) — not their sum,
      // since the fade-in now starts before the expand is done.
      const totalMs = opening
        ? Math.max(PANEL_EXPAND_MS, CONTENT_FADE_IN_DELAY_MS + CONTENT_FADE_IN_MS)
        : CONTENT_FADE_OUT_MS + PANEL_COLLAPSE_MS;
      const settled: PanelState = opening ? "open" : "closed";
      timerRef.current = setTimeout(() => setState(settled), totalMs);
      return opening ? "opening" : "closing";
    });
  }, [storageKey]);

  return [state, toggle] as const;
}

/**
 * Plain open/closed persistence for the bottom Failure Lab dock — it has no
 * width-driven text-reflow problem (its collapse is an instant CSS
 * `display:none` swap, not an animated width transition), so it doesn't
 * need the timed `opening`/`closing` sequencing `useAnimatedRail` exists for.
 */
function usePersistedRail(storageKey: string) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (localStorage.getItem(storageKey) === "open") setOpen(true);
    } catch {
      // Private browsing / blocked storage: default to closed for this visit.
    }
  }, [storageKey]);

  function toggle() {
    setOpen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem(storageKey, next ? "open" : "closed");
      } catch {
        // ignore
      }
      return next;
    });
  }

  return [open, toggle] as const;
}

export function Dashboard({ initialState }: { initialState: BoardState }) {
  const [state, setState] = useState<BoardState>(initialState);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [leftState, toggleLeft] = useAnimatedRail("aw-rail-left");
  const [rightState, toggleRight] = useAnimatedRail("aw-rail-right");
  const [dockOpen, toggleDock] = usePersistedRail("aw-rail-bottom");

  // Preview never persists anywhere (no localStorage, no fetch, no store
  // write) — it is plain in-memory React state, so a page refresh alone is
  // enough to fall back to the real `state` above. Kept as a fully separate
  // object rather than overwriting `state`, so the real board data is never
  // at risk of being clobbered by the synthetic one.
  const [preview, setPreview] = useState<DailyComparisonPreview | null>(null);
  const isPreview = preview !== null;
  const displayState = preview?.boardState ?? state;

  const enterPreview = useCallback(() => {
    setPreview(buildDailyComparisonPreview(new Date()));
  }, []);
  const exitPreview = useCallback(() => setPreview(null), []);

  async function retry() {
    setRetrying(true);
    setRetryError(null);
    try {
      const res = await fetch("/api/earthquake/latest", { cache: "no-store" });
      if (!res.ok) throw new Error(`요청 실패 (${res.status})`);
      const data = (await res.json()) as BoardState;
      setState(data);
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "다시 시도 요청에 실패했습니다.");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="aw-stage">
      <div className="lg:relative lg:z-10">
        <Header state={displayState} onRetry={retry} retrying={retrying} isPreview={isPreview} onExitPreview={exitPreview} />
      </div>

      <div className="aw-map-layer" aria-hidden={!displayState.current}>
        <WorldMap state={displayState} isLoading={retrying && !isPreview} isPreview={isPreview} />
        <div className="aw-map-fade lg:hidden" aria-hidden />
        <p className="aw-annotation absolute bottom-3 left-1/2 w-max max-w-[88vw] -translate-x-1/2 rounded-full px-3 py-1 text-center text-[11px] text-[var(--ink-2)] lg:hidden">
          {MAP_LEGEND_NOTE}
        </p>
      </div>

      <div className="lg:pointer-events-none lg:relative lg:z-10 lg:flex lg:min-h-0 lg:flex-1 lg:flex-col lg:overflow-hidden">
        {retryError && (
          <p
            role="alert"
            className="aw-widget pointer-events-auto mx-3 mt-3 text-sm sm:mx-4"
            style={{ color: "var(--status-error)" }}
          >
            {retryError}
          </p>
        )}

        <div className="aw-main p-3 sm:p-4 lg:pointer-events-none lg:min-h-0">
          <LeftPanel
            state={displayState}
            panelState={leftState}
            onToggle={toggleLeft}
            isPreview={isPreview}
            twoDaysAgo={preview?.twoDaysAgo ?? null}
          />
          <RightPanel
            state={displayState}
            onRetry={retry}
            retrying={retrying}
            panelState={rightState}
            onToggle={toggleRight}
            isPreview={isPreview}
          />
        </div>

        {/* Deliberately positioned against THIS wrapper (full viewport
            width, unaffected by the side rails' own width) rather than as a
            child of `.aw-main`'s grid — centering it in the grid's flexible
            middle track made it visibly slide left/right every time a rail
            opened or closed, since that track's own width and position
            change with the rail. Anchoring to a fixed width instead means
            its horizontal position never moves regardless of panel state. */}
        <p
          aria-hidden
          className="pointer-events-none hidden lg:absolute lg:inset-x-0 lg:bottom-0 lg:flex lg:justify-center lg:px-3 lg:pb-5"
        >
          <span className="aw-annotation pointer-events-auto w-max max-w-[60vw] rounded-full px-3 py-1 text-center text-[11px] text-[var(--ink-2)]">
            {MAP_LEGEND_NOTE}
          </span>
        </p>
      </div>

      <div id="aw-dock" data-open={dockOpen} className="px-3 pb-3 sm:px-4 sm:pb-4 lg:relative lg:z-10 lg:px-4 lg:pb-4">
        <FailureDock
          previewActive={isPreview}
          onEnterPreview={enterPreview}
          onExitPreview={exitPreview}
          open={dockOpen}
          onToggle={toggleDock}
        />
      </div>

      <p className="px-4 pb-3 text-center text-[11px] text-[var(--ink-2)] lg:hidden">
        로그인 없이 열람할 수 있는 공개 화면입니다. 개인정보를 수집하지 않습니다.
      </p>
    </div>
  );
}
