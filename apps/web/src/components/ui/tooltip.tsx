"use client";

import * as RadixTooltip from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";
import { Kbd } from "./kbd";

export const TooltipProvider = RadixTooltip.Provider;

/** Every control with a shortcut shows it here as a kbd chip. */
export function Tooltip({
  label,
  shortcut,
  children,
}: {
  label: string;
  shortcut?: string;
  children: ReactNode;
}) {
  return (
    <RadixTooltip.Root>
      <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
      <RadixTooltip.Portal>
        <RadixTooltip.Content
          sideOffset={6}
          className="text-data-sm flex items-center gap-sm rounded-sm border border-border bg-raised px-sm py-xs text-on-surface shadow-float"
        >
          {label}
          {shortcut ? <Kbd>{shortcut}</Kbd> : null}
        </RadixTooltip.Content>
      </RadixTooltip.Portal>
    </RadixTooltip.Root>
  );
}
