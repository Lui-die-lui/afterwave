import { IconFlask } from "./icons";

/**
 * Deliberately distinct from `StatusBadge` — a preview must never read as a
 * real `fresh`/`stale`/`error` state, so this uses its own color (the same
 * blue-violet as the "previous record" marker, already established as the
 * app's "synthetic history" color) and always renders the same fixed label.
 */
export function PreviewBadge({ size = "md" }: { size?: "sm" | "md" }) {
  const pad = size === "sm" ? "px-2.5 py-1 text-xs" : "px-3.5 py-1.5 text-sm";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-semibold ${pad}`}
      style={{
        color: "var(--marker-previous)",
        borderColor: "color-mix(in srgb, var(--marker-previous) 45%, transparent)",
        background: "color-mix(in srgb, var(--marker-previous) 16%, transparent)",
      }}
    >
      <IconFlask className="h-4 w-4 shrink-0" aria-hidden />
      합성 데이터 미리보기
    </span>
  );
}
