import { useId, type InputHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

export function Input({
  error,
  id,
  className,
  "aria-describedby": describedBy,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { error?: string }) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const messageId = error ? `${inputId}-error` : undefined;
  const describedByIds =
    [describedBy, messageId].filter(Boolean).join(" ") || undefined;
  return (
    <div className="flex flex-col gap-xs">
      <input
        id={inputId}
        aria-invalid={error ? true : undefined}
        className={cx(
          "text-body-md w-full rounded-sm bg-surface px-sm py-sm outline outline-1 -outline-offset-1 outline-secondary placeholder:text-secondary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-tertiary",
          error ? "text-error" : "text-on-surface",
          className,
        )}
        {...props}
        aria-describedby={describedByIds}
      />
      {error ? (
        <p id={messageId} className="text-body-sm text-error">
          <span aria-hidden="true">! </span>
          {error}
        </p>
      ) : null}
    </div>
  );
}
