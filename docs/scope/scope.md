# Scope: Take Studio

A web app where you upload a raw green screen take and get back a YouTube ready cut: it trims the pauses, keys out the green, places you on your studio background and writes a transcript, then you review every automatic edit and fix what it got wrong. It is for Toyin plus a few invited people, each with their own takes library. `DESIGN.md` (Edit Bay) is the source of truth for look, layout and behaviour.

**Build approach:** Tracer Bullet (each slice works end to end, from storage and the worker through to the workspace, before the next one starts).
**Workflow:** GA (after `/develop`: `/check verify`, then `/document` and `/sync`; tests only where they earn their keep, never for markup, styling or trivial code). CodeRabbit on GitHub is the code review.
**Design references:** every UI spec (`/architect` for a page or component) and every frontend PR gathers real screens and flows with the Mobbin MCP and lists them, with links, in a "References" section. `DESIGN.md` still wins on look and behaviour; Mobbin informs layout and interaction patterns.

_These are recommendations to keep the build orderly, not requirements. You decide when a feature is `done`._

## Product decisions (from Toyin, 2026-11-09)

- **Users:** Toyin plus a few invited people. Invite only, no open sign ups. Each person has a separate takes library.
- **Export:** 1080p MP4 download only. No direct YouTube upload.
- **Longest take:** 30 minutes. Uploads must resume after a dropped connection.
- **Transcript:** words can be corrected, and an SRT caption file timed to the final cut can be downloaded.
- **Studio background:** one per person, uploaded in settings, used for every take that person processes.
- **Pause detection:** any silence of 0.8 seconds or more becomes a numbered cut; each person can change that length in settings, and any single cut can be switched back on.

## At a glance

| # | Feature | Phase | Status |
|---|---------|-------|--------|
| 1 | Stack & architecture | Foundation | in-progress |
| 2 | Coding standards & tooling | Foundation | in-progress |
| 3 | Data model | Foundation | planned |
| 4 | Design system & workspace shell | Foundation | planned |
| 5 | Invite only sign in | Slice 1 | planned |
| 6 | Upload a take to the library | Slice 1 | planned |
| 7 | Processing pipeline with real progress | Slice 2 | planned |
| 8 | Trim: pauses as reversible cuts | Slice 2 | planned |
| 9 | Preview and timeline | Slice 2 | planned |
| 10 | Key and place on the studio background | Slice 3 | planned |
| 11 | Synced, editable transcript | Slice 4 | planned |
| 12 | Export 1080p MP4 and SRT | Slice 5 | planned |
| 13 | Keyboard shortcuts | Slice 5 | planned |
| 14 | Small screens: drawer and review only mode | Slice 5 | planned |

## Foundations

### 1. Stack & architecture · in-progress
Pick the stack, hosting, storage, queue and transcription provider, then scaffold a runnable web app and worker.
**Done when:** the stack is recorded in a spec Toyin approved, and the scaffold boots locally and deploys to dev.
- [x] Decide the stack (spec): `/architect stack & architecture`
- [x] Scaffold from the decision: `/develop stack & architecture`
   - [x] Web app and worker run locally against Postgres and object storage
   - [ ] Dev deploy answers 200 and CI runs on every PR
Spec 0001

### 2. Coding standards & tooling · in-progress
Capture conventions and tooling from the real scaffold so every later PR follows the same rules.
**Done when:** root `AGENTS.md` reflects the real stack, and lint, format, typecheck and CI run clean.
- [x] Capture conventions + tooling choices: `/audit`
- [ ] Install the tooling: `/develop tooling`

### 3. Data model · needs a decision
People, invites, settings (pause length, background), takes, pipeline runs and steps, cuts, transcript words, exports.
**Done when:** every later slice (cut toggles, word edits, export) fits without a breaking migration, and every row is scoped to its owner.
- [ ] Design it (spec): `/architect data model`

### 4. Design system & workspace shell
Turn `DESIGN.md` into tokens, fonts and base components, and lay out the three panel workspace (library, stage, inspector) fixed to the viewport.
**Done when:** tokens match `DESIGN.md` exactly, base components (buttons, input, kbd, chip, dialog, toast, tooltip) handle focus with the Verdigris ring, and the empty workspace renders dark only with panels scrolling internally.
**Starting Mobbin references:** [Jitter editor](https://mobbin.com/screens/17629e26-aaab-4170-b7c7-3374a5e0330c) (left panel, stage with timeline beneath, right inspector), [Gemini Notebook](https://mobbin.com/screens/b97d0037-12f3-4df0-a942-2093bbf7d793) (three panels with a video player in the right panel), [Higgsfield](https://mobbin.com/screens/4f4c12e7-583f-43c0-a034-cebfde8b7d49) (dark video workspace with a dominant centre stage).
- [ ] Build it: `/develop design system & workspace shell`

## Slice 1: Sign in and upload

### 5. Invite only sign in · needs a decision
Email sign in for invited people only; Toyin can invite and remove people.
**Done when:** an invited email can sign in, an uninvited one cannot, and each person sees only their own takes.
- [ ] Design it (spec): `/architect invite only sign in`

### 6. Upload a take to the library · needs a decision
Upload a raw take of up to 30 minutes straight to storage, resuming after a dropped connection, and list it in the library.
**Done when:** a 30 minute take uploads with a real percentage, survives a dropped connection, and appears as a 32px library row with duration and state; a failed upload shows "Failed" and a next step.
- [ ] Design it (spec): `/architect upload a take`

## Slice 2: Trim, preview, timeline

### 7. Processing pipeline with real progress · needs a decision
A queue runs trim, key, place, transcribe in that fixed order on the worker and reports each step's progress.
**Done when:** every step chip shows pending, running with a determinate percentage, or done with a check and duration; a failed step says why and can be retried; no spinner anywhere. Until Slice 3 ships, key and place pass the raw take through (marked as skipped on their chips) and the preview is a 720p proxy of the raw take, so no background is needed in this slice.
- [ ] Design it (spec): `/architect processing pipeline`

### 8. Trim: pauses as reversible cuts · needs a decision
Detect silences at or above the person's pause length and store them as numbered cuts that are never applied destructively.
**Done when:** each cut shows its number and length (`CUT 1.24s`), clicking it switches it back on or off in one click, and the pause length in settings changes detection on the next run.
- [ ] Design it (spec): `/architect trim and cut list`

### 9. Preview and timeline · needs a decision
The stage: preview on top, timeline beneath with clips, Sandy Brown cut regions and one Tuscan Sun playhead with a timecode flag.
**Done when:** playback skips active cuts, the playhead moves linearly with a mono timecode, and toggling a cut updates the preview straight away.
- [ ] Design it (spec): `/architect preview and timeline`

## Slice 3: Key and place

### 10. Key and place on the studio background · needs a decision
Key out the green and composite the person onto the background they uploaded in settings.
**Done when:** a person can upload or replace their background in settings, and "Process take" asks for one (with a link to settings) when none is set; processed takes show them on it with no green spill; the key threshold is shown as a number you can change, which reruns key and place for that take; a "Key off" toggle shows the raw take in one click to compare, and "Reset to auto" restores the detected threshold in one click.
- [ ] Design it (spec): `/architect key and place`

## Slice 4: Transcript

### 11. Synced, editable transcript · needs a decision
Word level transcript in the inspector that follows playback, highlights the current word, seeks on click and lets you fix words.
**Done when:** the current word is highlighted in sync, clicking a word moves the playhead, a corrected word persists, and words inside active cuts are marked as cut.
- [ ] Design it (spec): `/architect synced transcript`

## Slice 5: Export and polish

### 12. Export 1080p MP4 and SRT · needs a decision
Render the final cut at 1080p with active cuts applied, and generate an SRT caption file timed to that cut.
**Done when:** "Export 1080p" renders with a real percentage, the MP4 and SRT download, and captions line up with the trimmed video.
- [ ] Design it (spec): `/architect export`

### 13. Keyboard shortcuts
Keyboard first control of playback, cut toggling, take navigation and export, each shortcut shown in its tooltip as a kbd chip.
**Done when:** every control with a shortcut shows it in its tooltip, and a full review (play, step through cuts, toggle, export) works without the mouse.
- [ ] Build it: `/develop keyboard shortcuts`

### 14. Small screens: drawer and review only mode
Below 1100px the inspector becomes a tabbed drawer; below 720px the app is review only.
**Done when:** under 720px you can preview, read the transcript and export, with no timeline editing; row height and type sizes never change.
- [ ] Build it: `/develop small screens`

## Deferred
Out of scope for this build, kept so the plan stays honest.
- **Direct YouTube upload**: send a cut straight to a channel · needs a decision
- **Background library per take**: several backgrounds, pick one per take · needs a decision
- **Open sign ups**: anyone can make an account · needs a decision

## Legend

**The decision box.** Every feature carries at most one box ending in `(spec)`. Every other box is an execution box.

- **Next step** = the first unticked box.
- **needs a decision** = run `/architect` first, then `/develop`.
- **Status** `planned` → `in-progress` → `done`, plus `dropped` (kept for history).
- **Workflow** GA here means `/check verify` and `/document` after `/develop`, with tests only where they are needed.
- **Pointer line** (`spec <n> · code in <path>`): the spec link added by `/architect`, the code path by `/develop`.
