import { cx } from "@/lib/cx";

export type StepState =
  | { readonly kind: "pending" }
  | { readonly kind: "running"; readonly percent: number }
  | { readonly kind: "done"; readonly duration: string }
  | { readonly kind: "failed" };

const base = "text-data-sm inline-flex items-center gap-xs rounded-sm px-xs";

const clampPercent = (percent: number) =>
  Math.min(100, Math.max(0, Math.round(percent)));

export function StepChip({ state }: { state: StepState }) {
  switch (state.kind) {
    case "pending":
      return (
        <span className={cx(base, "bg-raised text-secondary")}>Pending</span>
      );
    case "running": {
      const percent = clampPercent(state.percent);
      return (
        <span
          role="progressbar"
          aria-label="Step progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          className={cx(base, "bg-tertiary text-surface")}
        >
          {percent}%
        </span>
      );
    }
    case "done":
      return (
        <span className={cx(base, "bg-raised text-secondary")}>
          <span aria-hidden="true">✓</span>
          <span className="sr-only">Done in </span>
          {state.duration}
        </span>
      );
    case "failed":
      return (
        <span className={cx(base, "bg-raised text-error")}>
          <span aria-hidden="true">✕</span>
          Failed
        </span>
      );
  }
}
