"use client";

import { useEffect, useState } from "react";
import { IconMoon, IconSun } from "./icons";

type Theme = "light" | "dark";

/**
 * Reads whatever the inline head script already put on <html data-theme>
 * so this never fights the no-flash init. Starts at "light" to match the
 * server-rendered guess and corrects itself post-mount if a saved choice
 * was actually "dark" — a one-time client update, not a hydration mismatch,
 * since the button's own DOM never diverges from what the server sent.
 */
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const current = document.documentElement.getAttribute("data-theme") === "dark" ? "dark" : "light";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.setAttribute("data-theme", next);
    try {
      localStorage.setItem("aw-theme", next);
    } catch {
      // Private browsing / blocked storage: theme still applies for this visit.
    }
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={isDark}
      title={isDark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      className="aw-btn aw-btn-ghost"
    >
      {isDark ? <IconMoon className="h-4 w-4" aria-hidden /> : <IconSun className="h-4 w-4" aria-hidden />}
      <span>{isDark ? "다크 모드" : "라이트 모드"}</span>
    </button>
  );
}
