import type { ButtonHTMLAttributes } from "react";
import { cx } from "@/lib/cx";

export type ButtonVariant = "primary" | "secondary" | "danger";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-tertiary text-surface hover:bg-tertiary-strong",
  secondary: "bg-raised text-on-surface hover:bg-primary",
  danger: "bg-error text-surface hover:brightness-110",
};

export function Button({
  variant = "secondary",
  className,
  type = "button",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant }) {
  return (
    <button
      type={type}
      className={cx(
        "text-label-md inline-flex items-center justify-center rounded-sm px-md py-sm transition-colors duration-120 disabled:opacity-50 disabled:pointer-events-none",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
