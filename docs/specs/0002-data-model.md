# 0002 Data model

**Status**: Proposed
**Date**: 2026-11-09
**Scope feature**: 3. Data model (`docs/scope/scope.md`)

## Summary

This spec fixes every table Take Studio needs, from sign in through export, so later slices only add tables and never rewrite one. Each take belongs to one person, and everything about a take (its upload, pipeline runs, cuts, words, exports) hangs off that take, so one ownership check covers it all. Edits stay data: a cut is a row you switch on or off, a fixed word keeps its original beside the correction, and only export applies them. Tables arrive with the slice that first uses them, each as its own additive migration.

## Context

The scope lists the moving parts: people, invites, settings (pause length, background), takes, pipeline runs and steps, cuts, transcript words and exports. Spec 0001 already settled Postgres with Drizzle ORM, pg-boss on the same database, R2 for every video byte, and Auth.js for sign in. What is missing is the shape of the rows.

Three forces shape it. First, the review loop must be instant and undoable (spec 0001, R4), so toggling a cut or fixing a word must be a single row update with nothing recomputed. Second, the pipeline can run again on the same take (new pause length, new key threshold), so results must belong to the run that made them, otherwise a rerun half overwrites the last one. Third, each person sees only their own takes (R6), and a slip here leaks someone's footage.

Without this spec, each slice would invent its own columns, and the cut toggle, word fix and export (three different slices) would disagree about where a cut or a word lives.

## Requirements

**User stories**:

- As an invited person, I want my takes, settings and background kept apart from everyone else's so that nobody sees my footage.
- As a person reviewing a take, I want cut toggles and word fixes saved straight away and reversible so that review is fast and safe.
- As the builder of a later slice, I want the tables I need already designed so that my slice adds a migration and never breaks one.

**Acceptance criteria**:

- **AC-1**: Every table in this spec exists after the migrations of the slice that introduces it, and every later migration is additive (new tables, new nullable columns or columns with defaults, new indexes). No later slice renames or drops a column defined here.
- **AC-2**: Every row that holds a person's data reaches its owner either directly (`user_id`) or in one join through `takes.user_id`. The data access layer exposes owner scoped helpers (`getTakeForOwner(takeId, userId)` and friends) and no route reads takes, runs, cuts, words or exports without one.
- **AC-3**: Toggling a cut is one `UPDATE cuts SET active = …` and fixing a word is one `UPDATE transcript_words SET corrected_text = …`. Neither touches video or any other row.
- **AC-4**: A rerun of the pipeline creates a new `pipeline_runs` row with its own steps, cuts and words. The previous run's rows stay until the new run succeeds, so the workspace never shows a half replaced result.
- **AC-5**: The library state shown on a take row is computed at read time from the upload, the take's probe result and the latest pipeline run, using the rule in _Library state_ below. No stored status column duplicates it.
- **AC-6**: Deleting a take (spec 0004, AC-13) removes its upload, runs, steps, cuts, words, assets and exports through `ON DELETE CASCADE`. Removing a person's access never deletes their data.
- **AC-7**: Times on the take timeline are integer milliseconds from the start of the raw take (`start_ms`, `end_ms`), the same unit everywhere (cuts, words, waveform, export).

## Options considered

### Option 1: One take table with JSON columns

Store cuts, words and step progress as JSON arrays on the take.

**Pros**:

- Fewest tables, one read loads a whole take.

**Cons**:

- A cut toggle or word fix rewrites the whole array; two quick edits can overwrite each other.
- Reruns overwrite in place, which breaks AC-4.
- No way to index or count words or cuts without loading everything.

### Option 2: Normalised tables, results owned by the run that produced them (chosen)

A row per cut, per word, per step, each pointing at its pipeline run, and the take's current result is its latest successful run.

**Pros**:

- Each edit is one small row update (AC-3).
- Reruns never clobber the live result (AC-4).
- Ownership is one join away for every row (AC-2).

**Cons**:

- More tables and one extra join to find the current run.
- Cut toggles and word fixes do not carry over to a rerun (see Consequences).

### Option 3: Event log of edits replayed onto detected results

Store detections once and every edit as an event.

**Pros**:

- Full history and unlimited undo.

**Cons**:

- Every read replays events; much more code for an app with a handful of people.
- Undo is already handled in the browser (see Feature design).

## Decision

**Chosen option**: Option 2: Normalised tables, results owned by the run that produced them.

Postgres tables defined in Drizzle in `packages/db`, `uuid` primary keys (`defaultRandom()`), `timestamptz` for every timestamp, integer milliseconds for every position on the take timeline, and owner scoping through `takes.user_id`.

## Rationale

The review loop is the product (DESIGN.md calls it the reason the interface exists), and it is made of tiny edits: one cut, one word. Row per item makes each edit a single indexed update with no read modify write race, which is what "instant and undoable" needs. Tying cuts and words to a run is the cheapest way to make reruns safe: the new run writes beside the old one and the take simply points at the newest successful run.

Option 1 fails on concurrent edits and reruns, which are both normal use. Option 3 buys history nobody asked for at the price of replay logic in every read. Undo lives in the browser as a stack of reverse updates, which covers the "undoable" requirement without server history.

Integer milliseconds avoid float drift when the export maths (spec 0001, _Export_) shifts words across cuts, and a 30 minute take is 1,800,000 ms, far inside a 32 bit integer.

## Feature design

**Data model sketch** (Drizzle, `packages/db/src/schema/*.ts`; ✱ marks the slice whose migration adds the table):

People and access (✱ Slice 1, sign in; details in spec 0003)

| Table                 | Columns                                                                                                                                                                                                                                                                                                                                                                          | Keys and constraints                                                                                                                                                                                                   |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `users`               | `id uuid`, `email text not null` (stored lowercased), `name text null`, `email_verified timestamptz null`, `image text null`, `created_at timestamptz not null default now()`                                                                                                                                                                                                    | PK `id`; unique `email`. Auth.js Drizzle adapter table with these names.                                                                                                                                               |
| `accounts`            | Auth.js adapter columns (`user_id`, `type`, `provider`, `provider_account_id`, token columns)                                                                                                                                                                                                                                                                                    | PK (`provider`, `provider_account_id`); FK `user_id → users` cascade. Required by the adapter, unused by email sign in.                                                                                                |
| `sessions`            | `session_token text`, `user_id uuid not null`, `expires timestamptz not null`                                                                                                                                                                                                                                                                                                    | PK `session_token`; FK `user_id → users` cascade; index `user_id`. Database sessions, so removing a person ends their sessions at once.                                                                                |
| `verification_tokens` | `identifier text`, `token text`, `expires timestamptz`                                                                                                                                                                                                                                                                                                                           | PK (`identifier`, `token`). Magic link tokens (Auth.js stores them hashed).                                                                                                                                            |
| `invites`             | `email text` (lowercased), `invited_by_user_id uuid not null`, `created_at timestamptz not null default now()`, `last_sent_at timestamptz not null default now()`, `accepted_at timestamptz null` (first sign in after this invite)                                                                                                                                              | PK `email`; FK `invited_by_user_id → users`. A row means "may sign in". Removing a person deletes the row; inviting again creates a fresh row with `accepted_at` null.                                                 |
| `user_settings`       | `user_id uuid`, `pause_length_ms integer not null default 800`, `background_key text null` (a new key per upload, `users/{userId}/backgrounds/{uuid}.{ext}`, never overwritten, so old runs keep their background), `background_width integer null`, `background_height integer null`, `background_updated_at timestamptz null`, `updated_at timestamptz not null default now()` | PK and FK `user_id → users` cascade; check `pause_length_ms between 200 and 5000`. Read through `getSettings(userId)`, which inserts the defaults when the row is missing. Background columns stay null until Slice 3. |
| `audit_events`        | `id uuid`, `actor_user_id uuid null`, `action text not null` (`invite.created`, `invite.resent`, `invite.removed`, `sign_in.succeeded`, `sign_in.refused`, `take.deleted`), `target_email text null`, `ip text null`, `created_at timestamptz not null default now()`                                                                                                            | PK `id`; index (`created_at`). Access control changes (spec 0003) and take deletes (spec 0004) are logged.                                                                                                             |
| `rate_limit_hits`     | `key text not null`, `hit_at timestamptz not null default now()`                                                                                                                                                                                                                                                                                                                 | Index (`key`, `hit_at`). Pruned daily (rows older than 24 h).                                                                                                                                                          |

Takes and uploads (✱ Slice 1, upload; details in spec 0004)

| Table     | Columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Keys and constraints                                                                                                                              |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `takes`   | `id uuid`, `user_id uuid not null`, `title text not null`, `original_filename text not null`, `content_type text not null`, `size_bytes bigint not null`, `fingerprint text not null`, `raw_key text not null`, `duration_ms integer null`, `width integer null`, `height integer null`, `fps real null`, `video_codec text null`, `probed_at timestamptz null`, `failure_code text null`, `key_threshold_override real null` (the person's chosen threshold; null means auto), `created_at timestamptz not null default now()` | PK `id`; FK `user_id → users` cascade; index (`user_id`, `created_at desc`, `id`); check `size_bytes > 0`. The override stays null until Slice 3. |
| `uploads` | `take_id uuid`, `r2_upload_id text not null`, `part_size_bytes integer not null`, `part_count integer not null`, `bytes_uploaded bigint not null default 0`, `status` enum `upload_status` (`in_progress`, `completed`, `failed`, `aborted`), `failure_code text null`, `started_at timestamptz not null default now()`, `last_activity_at timestamptz not null default now()`, `completed_at timestamptz null`                                                                                                                 | PK and FK `take_id → takes` cascade; index (`status`, `last_activity_at`) for the expiry sweep.                                                   |

Pipeline (✱ Slice 2)

| Table            | Columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | Keys and constraints                                                                                                                                                                                            |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pipeline_runs`  | `id uuid`, `take_id uuid not null`, `trigger` enum (`upload`, `manual`, `pause_length`, `key_threshold`), `base_run_id uuid null` (the run whose results are reused for steps this run does not redo), `pause_length_ms integer not null` (copied from settings at queue time), `background_key text null` (the background this run's place result used: copied from settings at queue time when the run redoes place, from `base_run_id` when it reuses place), `key_threshold_override real null` (copied from the take at queue time), `key_threshold_detected real null` (written by the key step), `state` enum `run_state` (`queued`, `running`, `succeeded`, `failed`), `created_at`, `started_at null`, `finished_at null` | PK `id`; FK `take_id → takes` cascade, `base_run_id → pipeline_runs`; index (`take_id`, `created_at desc`). Partial unique index on (`take_id`) where `state in ('queued','running')`: one active run per take. |
| `pipeline_steps` | `id uuid`, `run_id uuid not null`, `step` enum (`trim`, `key`, `place`, `transcribe`), `position smallint not null` (1 to 4), `state` enum `step_state` (`pending`, `running`, `done`, `failed`, `skipped`, `reused`), `progress_pct real not null default 0` (0 to 100), `attempt smallint not null default 1`, `error_code text null`, `error_message text null`, `started_at null`, `finished_at null`                                                                                                                                                                                                                                                                                                                          | PK `id`; FK `run_id → pipeline_runs` cascade; unique (`run_id`, `step`); check `progress_pct between 0 and 100`.                                                                                                |
| `take_assets`    | `id uuid`, `run_id uuid not null`, `kind` enum (`proxy_720`, `preview_720`, `waveform_peaks`, `keyed`), `r2_key text not null`, `size_bytes bigint null`, `created_at`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | PK `id`; FK `run_id → pipeline_runs` cascade; unique (`run_id`, `kind`).                                                                                                                                        |
| `cuts`           | `id uuid`, `run_id uuid not null`, `number integer not null` (1 based, in time order), `start_ms integer not null`, `end_ms integer not null`, `active boolean not null default true`, `updated_at timestamptz not null default now()`                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             | PK `id`; FK `run_id → pipeline_runs` cascade; unique (`run_id`, `number`); check `end_ms > start_ms`.                                                                                                           |

Transcript (✱ Slice 4)

| Table              | Columns                                                                                                                                                                                                                                                                                  | Keys and constraints                                                                                  |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| `transcript_words` | `id uuid`, `run_id uuid not null`, `index integer not null` (0 based, in time order), `text text not null` (as transcribed), `corrected_text text null`, `start_ms integer not null`, `end_ms integer not null`, `confidence real null`, `updated_at timestamptz not null default now()` | PK `id`; FK `run_id → pipeline_runs` cascade; unique (`run_id`, `index`); check `end_ms >= start_ms`. |

Export (✱ Slice 5)

| Table     | Columns                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | Keys and constraints                                                                                           |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `exports` | `id uuid`, `take_id uuid not null`, `run_id uuid not null`, `state` enum `export_state` (`queued`, `running`, `succeeded`, `failed`), `progress_pct real not null default 0`, `cut_ranges jsonb not null` (the active cuts at queue time, `[[start_ms, end_ms], …]`), `words_snapshot jsonb not null` (each word's shown text, `start_ms`, `end_ms` at queue time, so the SRT matches what was on screen), `mp4_key text null`, `srt_key text null`, `error_code text null`, `error_message text null`, `created_at`, `started_at null`, `finished_at null` | PK `id`; FK `take_id → takes` cascade, `run_id → pipeline_runs` cascade; index (`take_id`, `created_at desc`). |

Relationships: `users` 1:N `takes`, `sessions`, `audit_events` (as actor); `users` 1:1 `user_settings`; `takes` 1:1 `uploads`; `takes` 1:N `pipeline_runs`, `exports`; `pipeline_runs` 1:N `pipeline_steps` (exactly 4), `take_assets`, `cuts`, `transcript_words`. `invites` joins to `users` by `email`, not by key, because an invite exists before its user does.

**Current run of a take**: the newest `pipeline_runs` row for the take with `state = 'succeeded'`. The workspace reads cuts, words and assets from that run. While a newer run is queued or running, the chips show that run's steps, and the stage keeps showing the current (older) run's results.

**Library state** (computed in the take list query, AC-5; first match wins):

| Condition                                                               | Row shows                                                                                                   |
| ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `uploads.status = 'in_progress'`                                        | `Uploading NN%` when this tab is sending it, else `Interrupted NN%` (NN from `bytes_uploaded / size_bytes`) |
| `uploads.status in ('failed','aborted')` or `takes.failure_code` is set | `Failed` with the message for the code (spec 0004)                                                          |
| upload completed and `probed_at` is null                                | `Checking`                                                                                                  |
| an active run exists (`queued` or `running`)                            | `Processing` (Slice 2)                                                                                      |
| the latest run `failed` and no run ever succeeded                       | `Failed` (Slice 2); when an older run succeeded the row stays `Ready` and the chips show the failure        |
| a succeeded run exists                                                  | `Ready` (Slice 2)                                                                                           |
| otherwise                                                               | `Uploaded` (Slice 1), later `Needs background` when no background is set (Slice 3)                          |

**Cut state of a word** (derived at read time, never stored, matches spec 0001 _Export_): a word is cut when its midpoint `(start_ms + end_ms) / 2` falls inside an active cut of the same run.

**State transitions**:

- `uploads.status`: `in_progress → completed` (complete call succeeds) · `in_progress → failed` (complete call finds missing or wrong size parts) · `in_progress → aborted` (idle for 7 days, or R2 answers `NoSuchUpload`; a cancel deletes the take instead) · `failed → in_progress` only when `failure_code = 'parts_missing'` and the person resumes (spec 0004). No other transition leaves `completed`, `failed` or `aborted`.
- `pipeline_runs.state`: `queued → running → succeeded | failed`. A failed step can be retried, which sets the run back to `running`. A new run cannot be queued while one is queued or running (the partial unique index); the UI disables the actions that would queue one. A run whose worker job fails or expires is marked `failed` by the pipeline (spec for feature 7), so a crashed worker never blocks the take.
- `pipeline_steps.state`: `pending → running → done | failed`; `skipped` (key and place before Slice 3, transcribe before Slice 4, which adds `transcript_words`); `reused` (the step's results are copied from `base_run_id`); `failed → running` on retry (increments `attempt`).
- **Which steps a rerun redoes**: `pause_length` redoes trim only and reuses key, place and transcribe. `key_threshold` redoes key and place and reuses trim (cuts with their toggles) and transcribe (words with their fixes). `manual` and `upload` redo all four. A step whose slice has not shipped (key and place before Slice 3, transcribe before Slice 4) is `skipped` in every run, rerun or not. Once its slice ships, a step the base run `skipped` is never reused; the rerun runs it. Reused cuts and words are copied as new rows into the new run; reused assets point at the same R2 objects (`take_assets` rows in the new run with the same `r2_key`), so asset cleanup must check that no run still references a key.
- **Edits made during a rerun carry over**: while a rerun is queued or running, the old run stays editable only for rows the rerun will reuse. Rows it will regenerate are read only, with a note in their panel ("Cuts are being detected again" or "The transcript is being redone"): cut toggles are disabled during a `pause_length`, `manual` or `upload` rerun, and word fixes during a `manual` or `upload` rerun. `setCutActive` and `setWordCorrection` enforce the same rule and answer 409 for those rows, so no accepted edit is ever lost. A failed rerun is no longer active, so those rows become editable again; retrying it shows the same discard confirmation as starting a rerun whenever a row it will regenerate was edited after the run was queued (`updated_at` later than the run's `created_at`), and the retry only proceeds once confirmed. In the same transaction that marks the new run `succeeded`, the worker copies the base run's current `cuts.active` (matched by `number`, when cuts were reused) and `transcript_words.corrected_text` (matched by `index`, when words were reused) onto the new run's rows, so every toggle or fix made before publication survives. An edit that arrives after publication targets a run that is no longer current, so `setCutActive` and `setWordCorrection` answer not found and the browser refetches the current run. It replays the edit only when that step's rows were reused by the new run (cuts on a `key_threshold` rerun, words on a `pause_length` or `key_threshold` rerun), matched by `number` or `index`. When the rows were regenerated their numbers and indexes can point at different content, so the edit is dropped and the workspace says "This take was just reprocessed. Your last change wasn't applied."
- `exports.state`: `queued → running → succeeded | failed`.

**API surface**: none of its own. This spec is the schema and the data access helpers in `packages/db`:

| Helper                                            | Inputs                                                  | Output                                           | Errors                                                            |
| ------------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ | ----------------------------------------------------------------- |
| `getTakeForOwner(takeId, userId)`                 | take id, session user id                                | the take or `null`                               | `null` when missing or owned by someone else (callers answer 404) |
| `listTakesForOwner(userId, cursor?, limit = 50)`  | user id, cursor (`created_at`, `id`)                    | takes with computed library state, next cursor   | none                                                              |
| `getCurrentRun(takeId)`                           | take id (already owner checked)                         | latest succeeded run or `null`                   | none                                                              |
| `setCutActive(cutId, takeId, active)`             | cut id, owner checked take id, boolean                  | updated cut                                      | not found when the cut is not in the take's current run           |
| `setWordCorrection(wordId, takeId, text \| null)` | word id, owner checked take id, text or null to restore | updated word                                     | not found when the word is not in the take's current run          |
| `getSettings(userId)`                             | user id                                                 | settings row, created with defaults when missing | none                                                              |

**Value sourcing**:

| Action              | Value                       | Source                                                                                                                                                                                                              |
| ------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Show a take row     | title                       | `takes.title`, set from the filename without its extension at upload (spec 0004)                                                                                                                                    |
| Show a take row     | duration                    | `takes.duration_ms` from the worker probe (spec 0004)                                                                                                                                                               |
| Show a take row     | state                       | computed by the _Library state_ rule above                                                                                                                                                                          |
| Detect pauses       | pause length                | `pipeline_runs.pause_length_ms`, copied from `user_settings.pause_length_ms` when the run is queued                                                                                                                 |
| Place on background | background                  | `pipeline_runs.background_key`, copied from `user_settings.background_key` at queue time when the run redoes place, else from the base run, so preview and export always use the background place actually rendered |
| Show `CUT 1.24s`    | number, length              | `cuts.number`, `cuts.end_ms − cuts.start_ms`                                                                                                                                                                        |
| Show a step chip    | state, percent, duration    | `pipeline_steps.state`, `progress_pct`, `finished_at − started_at`                                                                                                                                                  |
| Show a word         | text                        | `coalesce(corrected_text, text)`                                                                                                                                                                                    |
| Mark a word as cut  | cut flag                    | derived by the midpoint rule above                                                                                                                                                                                  |
| Show key threshold  | number                      | `coalesce(takes.key_threshold_override, current run's key_threshold_detected)`; "Reset to auto" sets the override to null. "Key off" is a view toggle in the browser, not stored                                    |
| Render an export    | cuts applied, caption words | `exports.cut_ranges` and `exports.words_snapshot`, both taken from the current run when the export is queued                                                                                                        |

**Key invariants**:

- Every owned row reaches `users.id` through `user_id` or `take_id → takes.user_id` (AC-2).
- At most one queued or running pipeline run per take (partial unique index).
- Each run has exactly the four steps, in positions 1 to 4, created together with the run in one transaction.
- Cut numbers within a run are 1..N in time order with no gaps; cuts within a run never overlap (the worker writes them sorted and merged).
- `corrected_text` null means "as transcribed"; setting it back to null restores the original.
- `invites.email`, `users.email` and every email compared at sign in are lowercased and trimmed before storage or comparison.

**Security model**: There is no row level security in Postgres; scoping is done in `packages/db` helpers, and every route resolves the session user first (spec 0003). A take, run, cut, word, asset or export that belongs to someone else is answered as 404, never 403, so ids reveal nothing. R2 object keys always start with `users/{userId}/` so a stray key can be checked against its owner. Personal data stored: email addresses, name (optional), IP addresses in `audit_events` and rate limit keys. Data flows: video moves between the browser and R2 only through presigned URLs scoped to the owner's keys (upload, preview playback, download); the worker reads and writes R2 directly; the web app never handles video bytes. The only data that leaves our infrastructure is take audio sent to Deepgram for transcription (spec 0001).

**Configuration required**: none new.

**Critical test scenarios** (Vitest against a test Postgres, only where the logic is real):

- Owner scoping: user B calling `getTakeForOwner` with user A's take id gets `null`; `setCutActive` with a cut from another take fails, verifies **AC-2**.
- Rerun safety: with a succeeded run 1 and a running run 2, `getCurrentRun` returns run 1; after run 2 succeeds it returns run 2, verifies **AC-4**.
- Edits during a rerun: toggle a cut on run 1 after a `key_threshold` run 2 copied its cuts; when run 2 succeeds its matching cut has the same `active` value, verifies **AC-4**.
- One active run: inserting a second queued run for the same take violates the partial unique index, verifies **AC-4**.
- Library state: each row of the _Library state_ table produces the expected label, verifies **AC-5**.
- Word cut flag: a word whose midpoint sits inside an active cut is cut, one whose midpoint sits outside is not, toggling the cut off clears it, verifies **AC-3**, **AC-7**.

## Build plan

The model above is the target. Under Tracer Bullet each slice adds the tables it first uses, as one migration in that slice's PR.

1. Slice 1, sign in (spec 0003 build): migration for `users`, `accounts`, `sessions`, `verification_tokens`, `invites`, `user_settings` (pause length only in use), `audit_events`, `rate_limit_hits`, satisfies **AC-1**, **AC-2**.
2. Slice 1, upload (spec 0004 build): migration for `takes` and `uploads`, plus `getTakeForOwner` and `listTakesForOwner` with the Slice 1 rows of the _Library state_ rule, satisfies **AC-2**, **AC-5**, **AC-6**, **AC-7**.
3. Slice 2, pipeline: migration for `pipeline_runs`, `pipeline_steps`, `take_assets`, `cuts`, plus `getCurrentRun`, `setCutActive` and the remaining _Library state_ rows, satisfies **AC-3**, **AC-4**, **AC-5**. The transcribe step is `skipped` in this slice, like key and place, so the pipeline needs no transcript table yet.
4. Slice 4, transcript: migration for `transcript_words` plus `setWordCorrection` and the word cut flag; transcribe stops being skipped, satisfies **AC-3**, **AC-7**.
5. Slice 5, export: migration for `exports`, satisfies **AC-1**.

## Consequences

**Positive**:

- Every edit in review is one row update, cheap enough to save on every click.
- Reruns are safe by construction; the stage never shows a half replaced result.
- Later slices know exactly which table they add.

**Negative / tradeoffs**:

- Cut toggles and word fixes belong to a run. A pause length rerun starts the cut list fresh (the cuts themselves change) but keeps word fixes; a key threshold rerun keeps both; a full rerun ("Process take" again) starts both fresh. The UI warns before any rerun that discards edits.
- Ownership lives in application code, not database policies, so every new route must use the owner scoped helpers. `/check verify` checks this.

**Neutral**:

- Transcript words are the biggest table: about 4,500 rows for a 30 minute take, a few hundred thousand rows in total for this group. No partitioning needed.
- Old runs are kept. A cleanup of superseded runs and their R2 assets can come later if storage grows.

## Follow-up

- [ ] Cleanup of superseded runs and their R2 assets, once storage size matters (only delete an R2 key no run references).
- [ ] Pipeline spec (feature 7): separate pg-boss queues for short jobs (probe, sweeps) and the pipeline, job expiry longer than the longest step, and marking a run `failed` when its job fails or expires.
