export const cx = (...parts: readonly (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");
