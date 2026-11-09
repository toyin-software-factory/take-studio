import type { ReactNode } from "react";
import { cx } from "@/lib/cx";

/** A square, shadowless panel that scrolls on its own. */
export function Panel({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section
      aria-label={title}
      className={cx("flex min-h-0 min-w-0 flex-col bg-neutral", className)}
    >
      <h2 className="text-label-caps shrink-0 p-sm text-secondary">{title}</h2>
      <div className="min-h-0 flex-1 overflow-y-auto p-lg">{children}</div>
    </section>
  );
}

export function EmptyNote({
  heading,
  children,
}: {
  heading: string;
  children: ReactNode;
}) {
  return (
    <div>
      <p className="text-headline-sm">{heading}</p>
      <p className="text-body-sm mt-xs text-secondary">{children}</p>
    </div>
  );
}
