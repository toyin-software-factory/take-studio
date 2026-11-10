"use client";

import { useState } from "react";
import { Kbd } from "@/components/ui/kbd";
import { StepChip } from "@/components/ui/step-chip";
import { cx } from "@/lib/cx";
import { EmptyNote, Panel } from "./panel";

const STEPS = ["Trim", "Key", "Place", "Transcribe"] as const;

type View = "takes" | "stage" | "inspector";

const VIEWS: readonly { readonly id: View; readonly label: string }[] = [
  { id: "takes", label: "Takes" },
  { id: "stage", label: "Stage" },
  { id: "inspector", label: "Inspector" },
];

/** Below 1100px one region shows at a time; from 1100px up all three show. */
const hideUnless = (active: View, view: View) =>
  active === view ? "" : "max-[1099px]:hidden";

/** Static shell. Fixed to the viewport; each panel scrolls internally. */
export function Workspace() {
  const [view, setView] = useState<View>("stage");
  return (
    <main className="flex h-dvh flex-col overflow-hidden bg-border">
      <nav
        aria-label="Workspace regions"
        className="flex gap-px min-[1100px]:hidden"
      >
        {VIEWS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={view === id}
            onClick={() => setView(id)}
            className={cx(
              "text-label-md flex-1 py-sm transition-colors duration-120",
              view === id
                ? "bg-primary text-on-surface"
                : "bg-neutral text-secondary",
            )}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)] gap-px min-[1100px]:grid-cols-[280px_minmax(0,1fr)_360px]">
        <Panel title="Takes" className={hideUnless(view, "takes")}>
          <EmptyNote heading="No takes yet">
            Uploaded takes appear here, one row each, with their duration.
          </EmptyNote>
        </Panel>

        <div
          className={cx(
            "grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-px",
            hideUnless(view, "stage"),
          )}
        >
          <section
            aria-label="Preview"
            className="flex min-h-0 flex-col items-center justify-center gap-lg overflow-y-auto bg-surface p-xl text-center"
          >
            <h1 className="text-display">No take open</h1>
            <p className="text-body-lg max-w-[66ch] text-secondary">
              Upload a green screen take to trim the pauses, key out the green
              and get a transcript.
            </p>
          </section>
          <section aria-label="Timeline" className="bg-neutral">
            <div className="flex items-center justify-between p-sm">
              <h2 className="text-label-caps text-secondary">Timeline</h2>
              <span className="text-data-lg text-on-surface">00:00:00.00</span>
            </div>
            <div className="text-data-sm flex h-[48px] items-center bg-neutral px-lg text-secondary">
              No clips yet. Press <Kbd className="mx-xs">Space</Kbd> to play
              once a take is open.
            </div>
          </section>
        </div>

        <Panel title="Inspector" className={hideUnless(view, "inspector")}>
          <h3 className="text-label-caps mb-sm text-secondary">Pipeline</h3>
          <ul className="divide-y divide-border border-y border-border">
            {STEPS.map((step) => (
              <li
                key={step}
                className="flex h-row items-center justify-between"
              >
                <span className="text-body-md">{step}</span>
                <StepChip state={{ kind: "pending" }} />
              </li>
            ))}
          </ul>
          <h3 className="text-label-caps mt-xl mb-sm text-secondary">
            Transcript
          </h3>
          <EmptyNote heading="No transcript yet">
            Words appear here once a take has been transcribed.
          </EmptyNote>
        </Panel>
      </div>
    </main>
  );
}
