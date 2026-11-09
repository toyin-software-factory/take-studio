"use client";

import * as RadixToast from "@radix-ui/react-toast";
import type { ReactNode } from "react";

export function ToastProvider({ children }: { children: ReactNode }) {
  return (
    <RadixToast.Provider swipeDirection="right">
      {children}
      <RadixToast.Viewport className="fixed right-lg bottom-lg z-50 flex w-[22rem] max-w-[calc(100vw-2rem)] flex-col gap-sm outline-none" />
    </RadixToast.Provider>
  );
}

/** Errors name the cause and the next step in plain words. */
export function ErrorToast({
  title,
  description,
  open,
  onOpenChange,
}: {
  title: string;
  description: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <RadixToast.Root
      open={open}
      onOpenChange={onOpenChange}
      className="animate-fade-in rounded-md border border-border bg-raised p-md text-body-md shadow-float"
    >
      <RadixToast.Title className="text-label-md text-error">
        <span aria-hidden="true">✕ </span>
        {title}
      </RadixToast.Title>
      <RadixToast.Description className="mt-xs text-on-surface">
        {description}
      </RadixToast.Description>
      <RadixToast.Close className="text-label-md mt-sm rounded-sm bg-surface px-sm py-xs text-secondary">
        Dismiss
      </RadixToast.Close>
    </RadixToast.Root>
  );
}
