import { Kbd } from "@/components/ui/kbd";
import { StepChip } from "@/components/ui/step-chip";
import { EmptyNote, Panel } from "./panel";

const STEPS = ["Trim", "Key", "Place", "Transcribe"] as const;

/** Static shell. Fixed to the viewport; each panel scrolls internally. */
export function Workspace() {
  return (
    <main className="grid h-dvh grid-cols-[280px_minmax(0,1fr)_360px] gap-px overflow-hidden bg-border">
      <Panel title="Takes">
        <EmptyNote heading="No takes yet">
          Uploaded takes appear here, one row each, with their duration.
        </EmptyNote>
      </Panel>

      <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-px">
        <section
          aria-label="Preview"
          className="flex min-h-0 flex-col items-center justify-center gap-lg overflow-y-auto bg-surface p-xl text-center"
        >
          <h1 className="text-display">No take open</h1>
          <p className="text-body-lg max-w-[66ch] text-secondary">
            Upload a green screen take to trim the pauses, key out the green and
            get a transcript.
          </p>
        </section>
        <section aria-label="Timeline" className="bg-neutral">
          <div className="flex items-center justify-between p-sm">
            <h2 className="text-label-caps text-secondary">Timeline</h2>
            <span className="text-data-lg text-on-surface">00:00:00.00</span>
          </div>
          <div className="text-data-sm flex h-[48px] items-center bg-neutral px-lg text-secondary">
            No clips yet. Press <Kbd className="mx-xs">Space</Kbd> to play once
            a take is open.
          </div>
        </section>
      </div>

      <Panel title="Inspector">
        <h3 className="text-label-caps mb-sm text-secondary">Pipeline</h3>
        <ul className="divide-y divide-border border-y border-border">
          {STEPS.map((step) => (
            <li key={step} className="flex h-row items-center justify-between">
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
    </main>
  );
}
