"use client";

import { useState } from "react";
import { Button } from "./button";
import { Dialog, DialogClose, DialogContent, DialogTrigger } from "./dialog";
import { Input } from "./input";
import { Kbd } from "./kbd";
import { StepChip } from "./step-chip";
import { ErrorToast } from "./toast";
import { Tooltip } from "./tooltip";

/** Static reference for the base components. Not linked from the workspace. */
export function Gallery() {
  const [toastOpen, setToastOpen] = useState(false);
  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-xl p-xl">
      <h1 className="text-headline-lg">Base components</h1>

      <section className="flex flex-col gap-sm">
        <h2 className="text-label-caps text-secondary">Buttons</h2>
        <div className="flex gap-sm">
          <Button variant="primary">Export 1080p</Button>
          <Button>Cancel</Button>
          <Button variant="danger">Delete take</Button>
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-label-caps text-secondary">Input</h2>
        <label htmlFor="name" className="text-label-md">
          Take name
        </label>
        <Input id="name" placeholder="Monday intro" />
        <label htmlFor="name-error" className="text-label-md">
          Take name, with an error
        </label>
        <Input
          id="name-error"
          defaultValue="intro?"
          error="Names cannot contain a question mark. Remove it and try again."
        />
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-label-caps text-secondary">Kbd and step chips</h2>
        <div className="flex flex-wrap items-center gap-sm">
          <Kbd>Space</Kbd>
          <Kbd>⌘</Kbd>
          <Kbd>K</Kbd>
          <StepChip state={{ kind: "pending" }} />
          <StepChip state={{ kind: "running", percent: 42 }} />
          <StepChip state={{ kind: "done", duration: "12.4s" }} />
          <StepChip state={{ kind: "failed" }} />
        </div>
      </section>

      <section className="flex flex-col gap-sm">
        <h2 className="text-label-caps text-secondary">
          Dialog, toast and tooltip
        </h2>
        <div className="flex gap-sm">
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="danger">Delete take</Button>
            </DialogTrigger>
            <DialogContent
              title="Delete this take?"
              description="The take and its transcript are removed for good. This cannot be undone."
            >
              <div className="flex justify-end gap-sm">
                <DialogClose asChild>
                  <Button>Keep take</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="danger">Delete take</Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
          <Button onClick={() => setToastOpen(true)}>Show error toast</Button>
          <Tooltip label="Play" shortcut="Space">
            <Button>Hover for tooltip</Button>
          </Tooltip>
        </div>
        <ErrorToast
          open={toastOpen}
          onOpenChange={setToastOpen}
          title="Upload failed"
          description="The connection dropped at 63%. Check your network and upload the take again."
        />
      </section>
    </div>
  );
}
