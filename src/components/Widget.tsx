import type { ReactNode } from "react";

export function Widget({
  title,
  headingId,
  emphasis = "default",
  order,
  className = "",
  children,
}: {
  title?: string;
  headingId?: string;
  emphasis?: "default" | "primary";
  /** Mobile-only flex order — cancelled at lg where each rail's own DOM order applies instead. */
  order?: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      className={`${emphasis === "primary" ? "aw-widget-primary" : "aw-widget"} lg:order-none ${className}`}
      style={order !== undefined ? { order } : undefined}
      aria-labelledby={title ? headingId : undefined}
    >
      {title && (
        <h2 id={headingId} className="aw-widget-title">
          {title}
        </h2>
      )}
      {children}
    </section>
  );
}
