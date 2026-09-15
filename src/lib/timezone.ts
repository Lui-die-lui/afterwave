const KST = "Asia/Seoul";

/** Asia/Seoul calendar date key, e.g. "2026-09-15". en-CA formats as YYYY-MM-DD. */
export function kstDateKey(input: Date | number | string): string {
  const d = new Date(input);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

/** Adds `days` calendar days to a YYYY-MM-DD key (plain date arithmetic, no timezone shift). */
export function addDaysToDateKey(dateKey: string, days: number): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  const utcNoon = Date.UTC(y, m - 1, d, 12, 0, 0);
  const next = new Date(utcNoon + days * 86_400_000);
  return [
    next.getUTCFullYear(),
    String(next.getUTCMonth() + 1).padStart(2, "0"),
    String(next.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

/** Human-readable Asia/Seoul timestamp for display, e.g. "2026-09-15 21:04:30 KST". */
export function formatKst(input: Date | number | string): string {
  const d = new Date(input);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: KST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(d);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")} KST`;
}
