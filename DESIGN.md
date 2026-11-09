---
version: alpha
name: Edit Bay
description: Dark-only design system for Take Studio — a web tool that takes an uploaded green-screen recording, trims the pauses, keys out the green, places the studio background and writes the transcript. Used repeatedly, for long sessions, by the person who made the footage.

colors:
  primary: "#264653"
  secondary: "#a9bbbd"
  tertiary: "#2a9d8f"
  tertiary-strong: "#6bd4bb"
  playhead: "#e9c46a"
  cut: "#f4a261"
  error: "#e76f51"
  neutral: "#101e24"
  raised: "#192a31"
  surface: "#081217"
  on-surface: "#e5eded"
  border: "#253a42"

typography:
  display:
    fontFamily: Archivo
    fontSize: 44px
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Archivo
    fontSize: 28px
    fontWeight: 700
    lineHeight: 1.15
    letterSpacing: -0.015em
  headline-md:
    fontFamily: Archivo
    fontSize: 20px
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: -0.005em
  headline-sm:
    fontFamily: Archivo
    fontSize: 15px
    fontWeight: 700
    lineHeight: 1.3
  body-lg:
    fontFamily: Archivo
    fontSize: 16px
    fontWeight: 400
    lineHeight: 1.6
  body-md:
    fontFamily: Archivo
    fontSize: 14px
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: Archivo
    fontSize: 13px
    fontWeight: 400
    lineHeight: 1.45
    letterSpacing: 0.005em
  label-md:
    fontFamily: Archivo
    fontSize: 13px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0.01em
  label-caps:
    fontFamily: Archivo
    fontSize: 11px
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: 0.1em
    fontFeature: "'case' 1"
  data-lg:
    fontFamily: JetBrains Mono
    fontSize: 20px
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: -0.01em
    fontFeature: "'tnum' 1, 'zero' 1, 'liga' 0"
  data-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: 400
    lineHeight: 1.45
    fontFeature: "'tnum' 1, 'zero' 1, 'liga' 0"
  data-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: 400
    lineHeight: 1.4
    letterSpacing: 0.02em
    fontFeature: "'tnum' 1, 'zero' 1, 'liga' 0"

rounded:
  none: 0px
  sm: 3px
  md: 6px
  full: 9999px

spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  xl: 24px
  xxl: 48px
  row: 32px
  gutter: 16px

components:
  page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
  divider:
    backgroundColor: "{colors.border}"
    height: 1px
  heading-empty:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.display}"
  heading-page:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-lg}"
  heading-dialog:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.headline-md}"
  panel:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: "{spacing.lg}"
  panel-header:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    typography: "{typography.label-caps}"
    padding: "{spacing.sm}"
  stage:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.data-md}"
    rounded: "{rounded.none}"
  timecode-readout:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.data-lg}"
  take-row:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    height: "{spacing.row}"
    padding: "{spacing.sm}"
  take-row-selected:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    height: "{spacing.row}"
    padding: "{spacing.sm}"
  take-meta:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    typography: "{typography.data-sm}"
  timeline-track:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.secondary}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.none}"
    height: 48px
  clip:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-surface}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  cut-region:
    backgroundColor: "{colors.cut}"
    textColor: "{colors.surface}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  playhead-flag:
    backgroundColor: "{colors.playhead}"
    textColor: "{colors.surface}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  transcript-line:
    backgroundColor: "{colors.neutral}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-lg}"
    padding: "{spacing.sm}"
  transcript-word-current:
    backgroundColor: "{colors.playhead}"
    textColor: "{colors.surface}"
    typography: "{typography.body-lg}"
    rounded: "{rounded.sm}"
  step-pending:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.secondary}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  step-active:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.surface}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  button-primary:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  button-primary-hover:
    backgroundColor: "{colors.tertiary-strong}"
    textColor: "{colors.surface}"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.md}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.sm}"
    padding: "{spacing.sm}"
  input-error:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.error}"
    typography: "{typography.body-sm}"
  toast-error:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.error}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.md}"
  dialog:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: "{spacing.xl}"
  tooltip:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.on-surface}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
  kbd:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.secondary}"
    typography: "{typography.data-sm}"
    rounded: "{rounded.sm}"
    padding: "{spacing.xs}"
---

# Edit Bay

## Overview

Take Studio is a grading suite for one person's footage: a darkened room where the only colour that matters is on the screen. You upload a take; the tool trims the pauses, keys out the green, drops in the studio background and writes the transcript; you review what it did and fix what it got wrong. The interface exists for that review, repeated dozens of times in a sitting.

The direction is Terminal Precision applied to video. It is dense, quiet, keyboard-first and fast, and it stays out of the way of the footage. The first-second feeling is **in control**: every automatic decision (a cut, a keyed edge, a transcript line) is visible, labelled with a number, and reversible.

The governing rule is that **the footage is the colour**. A person judging a key edge or skin tone needs a neutral surround, so the chrome stays almost colourless and the five brand hues are spent only where they carry information — and each carries exactly one kind.

**What this system gives up, knowingly.** First-time warmth: a newcomer meets density, mono numerals and keyboard hints. Playfulness: there is no illustration, no celebration, no confetti when a render finishes — the take is simply ready. Light-mode comfort in a bright room. A marketing site is not covered; if one is needed, it borrows these tokens at display size and does not soften them.

## Colors

The brand supplied five colours. A palette this evenly spread across teal and orange is easy to let become decoration, so each colour is assigned a single job, and none is allowed to do another's.

The ground is not any of the five. It is a ramp derived from **Charcoal Blue**'s own hue and darkened well past it, because a grading surround must be near-black and neutral. Charcoal Blue itself sits one step up that ramp as the colour of _selection and structure_. Neutrals are tinted toward that hue, so the room reads as a deliberate teal-slate rather than a stock grey or a blue-navy.

- **Primary (#264653):** Charcoal Blue — the studio wall. Selected take, timeline clips, anything that is "chosen" without being "live". Never a text colour.
- **Secondary (#a9bbbd):** Pale slate — metadata, durations, captions, panel legends. Readable muted text on every surface, including the selected row.
- **Tertiary (#2a9d8f):** Verdigris, the oxide on copper cable — **go**. The one primary button per view, the focus ring, the pipeline step that is running now, and the progress fill. It is a blue-green deliberately kept well away from chroma-key green so it is never mistaken for spill, and it never appears inside the video stage.
- **Tertiary-strong (#6bd4bb):** Verdigris lit up — hover and pressed state of the go control only.
- **Playhead (#e9c46a):** Tuscan Sun, the key light — **where you are**. The playhead line and its timecode flag, and the current word in the transcript. At most one pair of these exists on screen at any moment.
- **Cut (#f4a261):** Sandy Brown, an editor's grease-pencil mark — **what will be removed**. Detected pauses on the waveform and timeline. Always carries its duration as text.
- **Error (#e76f51):** Burnt Peach, the tally lamp — **something failed or is destructive**. Failed upload or render, delete, and any irreversible confirmation. Always paired with words or a glyph.
- **Surface (#081217):** The grading surround — page, video stage, sunken inputs.
- **Neutral (#101e24):** One lift up — panels, library rows, timeline tracks.
- **Raised (#192a31):** Two lifts up — floating layers, secondary buttons, chips. In a dark interface raised means lighter, never shadowed.
- **On-surface (#e5eded):** Pale slate-white — primary text. No pure white anywhere; it would out-shine the footage.
- **Border (#253a42):** Hairline between panels. Deliberately low contrast: it groups, it does not outline controls.

At rest, the only coloured pixels on screen are the footage and one Verdigris button. Tuscan Sun appears with playback, Sandy Brown with detected pauses, Burnt Peach with failure. If a screen is colourful while nothing is playing, cut or broken, something is misusing a hue.

## Typography

Two faces that differ by classification and by job. Both are open-source (SIL OFL) and ship on Google Fonts.

**Archivo** carries every word a person reads: headings, labels, the transcript. It is a neutral grotesque with real weight and width range, underused and unfussy. Only two weights are used, 400 and 700. Fallback: `'Helvetica Neue', Arial, sans-serif`.

**JetBrains Mono** carries every number and identifier: timecodes, durations, frame rates, file sizes, resolutions, shortcut keys. Its tall x-height holds up at 11px, and tabular, slashed-zero figures mean a ticking timecode never jitters. Ligatures are off. It is set one pixel smaller than the neighbouring Archivo because its x-height is taller. Fallback: `ui-monospace, 'SF Mono', Menlo, monospace`.

The scale is a dense 1.2 ratio on a 14px working size (11 / 12 / 13 / 14 / 16 / 20 / 28), with one deliberate jump to 44px for empty states only. Display tightens to −0.025em; uppercase panel legends track out to +0.1em; line-height falls as size rises. The transcript is the one place with reading-length text and runs at 16px/1.6, held to about 66 characters.

## Layout

A three-region workspace on a 4px base with 16px gutters: **library** on the left (about 280px), **stage** in the centre, **inspector** on the right (about 360px). The stage is the dominant region by design: preview on top, timeline directly beneath it, full width of the region. Library rows are 32px high and read like a table.

The inspector stacks the pipeline and the transcript. The pipeline is a ruled list of the four stages (trim, key, place, transcribe), each with a state chip and a mono duration, in that fixed order. The transcript below it scrolls in sync with the playhead and the current word is highlighted.

Density is uniform inside panels and generous only at the edges: 16px panel padding, 4–8px inside rows. The layout is fixed to the viewport; panels scroll internally and the page never does.

Breakpoints: below 1100px the inspector becomes a tabbed drawer over the stage; below 720px the app is review-only — preview, transcript and export, no timeline editing. Row height and type sizes never change.

## Elevation & Depth

Depth comes from tonal steps (surface, neutral, raised), 1px hairlines and spacing. There are no shadows on anything that is part of the page.

Only layers that actually float above the workspace — menus, dialogs, tooltips, toasts — carry a shadow, and it has physics: light from above, a tight dark contact shadow plus a wide soft one, both tinted toward the ground colour rather than neutral black, and always with a 1px border-colour edge as well. Floating layers take the raised fill. Nothing else in the system casts a shadow, including selected items and focused controls.

## Shapes

Radius is hierarchical, and the first rule is that **the footage is never rounded**. The stage, the timeline tracks and every panel are square (0px), because a video frame is a rectangle and softening its frame hides crop and key edges. **Controls and timeline objects take 3px**: buttons, inputs, chips, clips, cut regions. **Floating layers take 6px**: dialogs, toasts, menus. **Only round things are round**: status dots and the playhead handle.

Selected items change fill, not outline. Focus is a 2px Verdigris ring offset 2px, the same on every control, and it is the one outline in the system.

## Components

- **Take row:** Neutral fill, 32px high, title in body-md, duration and state in mono at the right edge. Selected rows fill with Charcoal Blue; text stays on-surface. A take that failed shows a peach glyph and the word "Failed", not only a colour.
- **Primary button:** Verdigris fill, dark label, 3px radius. One per view — usually "Process take" or "Export". Hover lifts to the lit Verdigris. The label states the outcome ("Export 1080p"), not the mechanism.
- **Secondary button:** Raised fill, on-surface label. Used for everything that is not the one go action.
- **Danger button:** Burnt Peach fill, dark label, only inside a confirmation that names what will be lost.
- **Pipeline step chip:** Pending is a raised chip in pale slate; the running step fills Verdigris with a determinate percentage; completed steps return to the pending style with a check glyph and their duration. Progress is always a number, never an indefinite spinner.
- **Timeline:** Neutral tracks, Charcoal Blue clips, Sandy Brown cut regions labelled in mono with their length (`CUT 1.24s`), one Tuscan Sun playhead with a timecode flag. Clicking a cut region toggles it back on; it never disappears silently.
- **Transcript line:** Timestamp in mono at left, text in body-lg. The current word has a Tuscan Sun fill with dark text. Clicking any word moves the playhead.
- **Input:** Sunken (surface) fill, 1px pale-slate outline so the boundary clears 3:1 against the panel, on-surface text. Focus replaces the outline with the Verdigris ring. Error switches the text to Burnt Peach, adds an inline message and a leading `!`.
- **Kbd chip:** Raised, pale slate, mono. Every control that has a shortcut shows it in its tooltip.
- **Toast and dialog:** Raised fill, 6px radius, shadow per Elevation. Errors name the cause and the next step in plain words.

## Do's and Don'ts

- Do keep the chrome neutral; let the footage and the key edge be the most colourful thing on screen.
- Do give every hue one job — Verdigris is go, Tuscan Sun is position, Sandy Brown is removal, Burnt Peach is failure, Charcoal Blue is selection — and nothing else.
- Do show a number with every automatic decision: cut length, key threshold, step duration, confidence.
- Do set every numeral — timecodes, sizes, counts — in tabular, slashed-zero JetBrains Mono.
- Do use one Verdigris primary button per view and make its label an outcome.
- Do make every automatic edit reversible in one click, and show how to reverse it.
- Do show real progress as a percentage with a duration; never an indefinite spinner or shimmer.
- Don't use Verdigris, or any green, inside the video stage or on the key preview — it will read as green spill.
- Don't use colour as the only carrier of state: failed, cut, selected and running all need text or a glyph as well.
- Don't colour-code the four pipeline stages with four hues; stage identity is ordinal position and label.
- Don't round the stage, tracks or panels, and don't give any of them a shadow.
- Don't introduce pure white, pure black or an equal-RGB grey, and don't put a gradient behind footage.
- Don't use weights other than 400 and 700, and don't use mono for sentences.
- Don't animate anything except 120ms colour and fill changes, determinate progress, and the playhead itself, which moves linearly with time. No bounces, no confetti, no skeleton shimmer, no layout motion; dialogs enter with a 160ms fade and leave instantly. Honour reduced-motion.
