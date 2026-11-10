import type { HTMLAttributes } from "react";
import { cx } from "@/lib/cx";

export function Kbd({ className, ...props }: HTMLAttributes<HTMLElement>) {
  return (
    <kbd
      className={cx(
        "text-data-sm inline-flex items-center rounded-sm bg-raised px-xs text-secondary",
        className,
      )}
      {...props}
    />
  );
}
