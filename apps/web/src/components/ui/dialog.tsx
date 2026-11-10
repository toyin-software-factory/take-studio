"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

export const Dialog = RadixDialog.Root;
export const DialogTrigger = RadixDialog.Trigger;
export const DialogClose = RadixDialog.Close;

export function DialogContent({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children?: ReactNode;
}) {
  return (
    <RadixDialog.Portal>
      <RadixDialog.Overlay className="animate-fade-in fixed inset-0 bg-surface/80" />
      <RadixDialog.Content className="animate-fade-in fixed top-1/2 left-1/2 w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 -translate-y-1/2 rounded-md border border-border bg-raised p-xl shadow-float">
        <RadixDialog.Title className="text-headline-md">
          {title}
        </RadixDialog.Title>
        <RadixDialog.Description className="text-body-md mt-sm text-secondary">
          {description}
        </RadixDialog.Description>
        <div className="mt-lg">{children}</div>
      </RadixDialog.Content>
    </RadixDialog.Portal>
  );
}
