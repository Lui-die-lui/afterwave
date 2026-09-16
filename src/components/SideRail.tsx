"use client";

import type { ReactNode } from "react";
import { IconChevronLeft, IconChevronRight } from "./icons";

export type PanelState = "closed" | "opening" | "open" | "closing";

/**
 * Desktop side rail, animated in four states — `closed -> opening -> open`
 * and `open -> closing -> closed` (see `useAnimatedRail` in Dashboard.tsx for
 * the timed state machine). Open: a transparent column holding independent
 * glass widgets, with a small panel head whose close button collapses it.
 * Closed: the column shrinks to 0 (the map behind reclaims the full width)
 * and the only thing left is a tab hugging the viewport edge with zero
 * margin. Both controls are the same disclosure — `aria-expanded` /
 * `aria-controls` point at the widget container either way. On mobile the
 * rail has no box of its own (display:contents) and neither control shows.
 *
 * `.aw-rail` (this component's own root) is the outer shell — only its
 * `width` ever transitions, and it stays `overflow:visible` so the
 * absolutely-positioned edge tab (a direct child, sized/positioned against
 * an ancestor further up, not against this shell) is never itself clipped
 * by the shell shrinking to 0. The actual clipping lives one layer in, on
 * `.aw-rail-clip` (`width:100%; height:100%; overflow:hidden`, always
 * matching whatever width the shell currently has) — `.aw-rail-content`
 * (the head + widgets together) sits inside THAT, laid out at the panel's
 * fully-open width no matter where the shell's width transition currently
 * is, so its text/buttons never see an intermediate narrow width to reflow
 * against; `.aw-rail-clip` is what reveals/clips it as the shell animates.
 * `.aw-rail-content` itself only ever transitions `opacity`/`visibility`,
 * timed by CSS `transition-delay` (in globals.css) to run AFTER the shell
 * finishes expanding (open) or BEFORE the shell starts shrinking (close).
 */
export function SideRail({
  side,
  panelState,
  onToggle,
  title,
  openLabel,
  closeLabel,
  panelId,
  ariaLabel,
  children,
}: {
  side: "left" | "right";
  panelState: PanelState;
  onToggle: () => void;
  /** Short visible name, e.g. "현재 정보" — shown upright on the tab and in the panel head. */
  title: string;
  /** Accessible name / tooltip of the tab while collapsed, e.g. "현재 정보 열기". */
  openLabel: string;
  /** Accessible name / tooltip of the close button while expanded, e.g. "현재 정보 접기". */
  closeLabel: string;
  panelId: string;
  ariaLabel: string;
  children: ReactNode;
}) {
  const CollapseIcon = side === "left" ? IconChevronLeft : IconChevronRight;
  const ExpandIcon = side === "left" ? IconChevronRight : IconChevronLeft;
  const expanded = panelState === "open" || panelState === "opening";

  return (
    <div id={`${side}-rail`} className="aw-rail lg:pointer-events-auto" data-side={side} data-state={panelState}>
      <div className="aw-rail-clip">
        <div className="aw-rail-content">
          <div className="aw-rail-head">
            <span className="aw-rail-head-title">{title}</span>
            <button
              type="button"
              className="aw-icon-btn"
              aria-expanded={expanded}
              aria-controls={panelId}
              aria-label={closeLabel}
              title={closeLabel}
              onClick={onToggle}
            >
              <CollapseIcon className="h-4 w-4" aria-hidden />
            </button>
          </div>

          <aside id={panelId} className="aw-rail-widgets" aria-label={ariaLabel}>
            {children}
          </aside>
        </div>
      </div>

      <button
        id={`${side}-rail-tab`}
        type="button"
        className="aw-edge-tab"
        aria-expanded={expanded}
        aria-controls={panelId}
        aria-label={openLabel}
        title={openLabel}
        onClick={onToggle}
      >
        <ExpandIcon className="h-4 w-4 shrink-0" aria-hidden />
        <span className="aw-edge-tab-label" aria-hidden>
          {title}
        </span>
      </button>
    </div>
  );
}
