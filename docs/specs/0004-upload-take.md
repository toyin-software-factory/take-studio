# 0004 Upload a take

**Status**: Proposed
**Date**: 2026-11-09
**Scope feature**: 6. Upload a take to the library (`docs/scope/scope.md`)

## Summary

You drop a video file (MP4 or MOV, up to 30 minutes) onto the library or pick it with "Upload take". The browser sends it straight to R2 in 64 MB pieces, four at a time, and the library row shows the real percentage. If the connection drops, the upload pauses and carries on by itself when the connection is back; if the tab closes, "Resume" asks for the same file again and sends only the missing pieces. When the last piece lands, the worker reads the file's real length and size, and the row shows its duration and "Uploaded", or "Failed" with what to do next.

## Context

A raw take is up to 30 minutes of green screen footage, often several GB (scope, *Product decisions*), and must survive a dropped connection. Spec 0001 settled the mechanism: browser direct to R2 with S3 multipart upload, 64 MB parts, presigned URLs, so the web app never handles video bytes. Spec 0002 added the `takes` and `uploads` tables and the library state rule.

What is left is the behaviour: which files are accepted and how limits are enforced, how resuming works within a tab and after a reload, what the library row shows in each state, how failures are explained, and what happens when the upload finishes. This is Slice 1 of a Tracer Bullet build, so it must also prove the path from browser to R2 to worker and back to the library.

## Requirements

**User stories**:
- As a person with a fresh take, I want to drop it into the library and watch a real percentage so that I know how long it will take.
- As a person on a flaky connection, I want the upload to carry on where it stopped so that I never start a 10 GB upload again.
- As a person whose upload failed, I want to know why and what to do next.

**Acceptance criteria**:
- **AC-1**: "Upload take" (button at the top of the library) and dropping a file anywhere on the library panel both start an upload. Several files can be added at once; they upload one after another in the order added, each with its own row (rows waiting their turn show `Queued`, held in the browser only). Adding a file whose fingerprint (name, size, modified time and a hash of its first and last 4 MB) matches an `Interrupted` take resumes that take instead of creating a new one.
- **AC-2**: Only `.mp4`, `.m4v` and `.mov` files of at most 25 GB are accepted. Anything else is refused before any upload starts, with a toast naming the cause ("Only MP4 or MOV files" or "Files over 25 GB aren't supported").
- **AC-3**: When the browser can read the file's duration before the upload, a file longer than 30:00 is refused the same way ("Takes can be up to 30 minutes"). When it cannot read it, the upload goes ahead and the worker probe enforces the limit (AC-9).
- **AC-4**: A new row appears at the top of the library as soon as an upload starts: title (the filename without its extension) and, at the right edge in mono, `Uploading 43%`. The percentage is bytes confirmed sent divided by file size, and a 2 px Verdigris fill along the bottom of the row grows with it.
- **AC-5**: When the connection drops, the row shows `Paused 43%` and the upload resumes by itself when the browser is back online, sending only parts not yet confirmed. No part is sent twice in full once R2 has confirmed it.
- **AC-6**: After a reload or closing the tab, an unfinished upload shows `Interrupted 43%` with a "Resume" action. Resume opens the file picker; when the chosen file has the same fingerprint, only the missing or wrongly sized parts are sent. A different file is refused with "That's a different file. Pick <original name>."
- **AC-7**: While an upload is running, leaving the page asks for confirmation (browser `beforeunload` prompt).
- **AC-8**: When all parts are sent, the upload is completed in R2, the row shows `Checking`, and the worker probes the file. On success the row shows the duration (`12:34`, mono) and `Uploaded`.
- **AC-9**: Failures show `Failed` with a peach glyph on the row, and selecting it shows the cause and next step: storage unreachable after retries ("Couldn't reach storage. Resume to try again."), file longer than 30:00 ("This take is longer than 30 minutes. Trim it and upload again."), unreadable file ("We couldn't read this video. Export it as MP4 or MOV and upload again."), parts missing at completion ("Some of the upload went missing. Resume to send it again."), expired ("This upload stopped more than 7 days ago. Upload it again."). Failed takes can be removed.
- **AC-10**: An uploading or interrupted take can be cancelled from its row (with a confirm dialog); the multipart upload is aborted in R2 and the row disappears.
- **AC-11**: The library lists only the signed in person's takes, newest first, 50 at a time, loading more as the panel scrolls. With no takes it shows the empty state: "No takes yet" (44 px), the primary "Upload take" button and "or drop a video file here".
- **AC-12**: A 30 minute take of several GB uploads end to end on the dev deployment with the percentage moving steadily, and survives the network being switched off and on mid upload.

## Options considered

### Option 1: Multipart upload with R2 as the memory of finished parts (chosen)

The web app creates the multipart upload and signs part URLs; the browser sends parts; resume asks R2 (`ListParts`) which parts it already has.

**Pros**:
- R2 is the single source of truth for what arrived; nothing to keep in sync.
- No parts table, no per part API call.

**Cons**:
- Resume needs one `ListParts` call (fine; at most 400 parts for 25 GB).

### Option 2: Same, but the browser records every finished part in Postgres

**Pros**:
- Progress visible to other tabs and devices without asking R2.

**Cons**:
- One more write per part and a table that can disagree with R2 after a crash.

### Option 3: An upload library with its own server (tus, Uppy Companion)

**Pros**:
- Resume and retries come ready made.

**Cons**:
- Another service to host, and spec 0001 already ruled against a tus server.

## Decision

**Chosen option**: Option 1: Multipart upload with R2 as the memory of finished parts.

The browser sends 64 MB parts with four in flight, through presigned `UploadPart` URLs signed in batches by the web app; resume uses `ListParts`; completion verifies every part before `CompleteMultipartUpload`; then the worker runs a `take.probe` job with ffprobe. The browser also saves `bytes_uploaded` on the take after each part, only for the `Interrupted NN%` label.

## Rationale

R2 already remembers finished parts, so asking it is both simpler and more correct than mirroring that memory in Postgres. Spec 0001 said finished parts are "remembered"; this spec makes R2 that memory and keeps only a display counter in Postgres.

Four parts in flight fills a typical home uplink without starving the rest of the app, and one file at a time means each row's percentage moves steadily instead of several crawling together. Part URLs are signed in batches of up to 20 so a 400 part upload makes about 20 small API calls, not 400.

The probe job is small but load bearing for a Tracer Bullet: it proves the worker can read a raw take from R2 and write back to Postgres, which every later slice relies on, and it is the only reliable way to get the real duration (browsers cannot read every MOV, ProRes in particular).

## Feature design

**Data model sketch**: spec 0002 `takes` and `uploads`, no new columns. R2 key for the raw take: `users/{userId}/takes/{takeId}/raw.{ext}` (ext lowercased from the filename: `mp4`, `m4v` or `mov`), stored in `takes.raw_key`. `takes.fingerprint` = `${name}:${size}:${lastModified}:${sample}`, where `sample` is the hex SHA-256 of the file's first 4 MB followed by its last 4 MB (the whole file when it is under 8 MB). Two different exports of a take differ in their container headers and index (MP4 `moov`, MOV atoms), which sit at the start or the end, so the sample tells them apart even with the same name, size and time. A full file digest was rejected: hashing up to 25 GB in the browser takes minutes before every upload and resume. `takes.failure_code` and `uploads.failure_code` use the codes in the table below.

**State transitions**: `uploads.status` per spec 0002: `in_progress → completed | failed | aborted`. After `completed`, the take is `Checking` until the probe sets `probed_at` (success) or `failure_code` (failure).

**Failure codes**:

| Code | Set on | Set when | Row message (AC-9) |
|---|---|---|---|
| `storage_unreachable` | browser only (not stored) | a part fails 8 times in a row while online | Couldn't reach storage. Resume to try again. (After a reload this upload shows `Interrupted`, since nothing was stored.) |
| `parts_missing` | `uploads.failure_code` | complete finds a missing part or sizes that do not add up to `size_bytes` | Some of the upload went missing. Resume to send it again. (Resume reopens the same multipart upload, status back to `in_progress`.) |
| `expired` | `uploads.failure_code`, status `aborted` | no activity for 7 days, or R2 answers `NoSuchUpload` on resume, parts or complete and no completed object of the right size exists (see *Recovery* in step 7) | This upload stopped more than 7 days ago. Upload it again. |
| `too_long` | `takes.failure_code` | probe duration over 1,801,000 ms (30:00 plus 1 s of grace; the browser check in AC-3 uses the same limit) | This take is longer than 30 minutes. Trim it and upload again. |
| `unreadable` | `takes.failure_code` | ffprobe finds no video stream or fails to parse | We couldn't read this video. Export it as MP4 or MOV and upload again. |

`parts_missing` is the one failed upload that can go back to `in_progress` (the exception listed in spec 0002's upload transitions).

**Upload flow** (all calls owner checked with `requireUser()` and `getTakeForOwner`, spec 0003 and 0002):
1. Browser checks extension and size (AC-2) against the shared constants in `packages/media` (`MAX_TAKE_BYTES = 25_000_000_000`, decimal 25 GB; `MAX_TAKE_MS = 1_801_000`; allowed extensions), reads duration with a hidden `<video preload="metadata">` (AC-3), then `POST /api/takes`.
2. Server validates again (content type must be `video/mp4`, `video/quicktime` or `video/x-m4v`; anything else, including empty, is replaced by the type for the extension), sets the title (filename without its last extension, trimmed, cut to 200 characters, "Untitled take" when empty; duplicates allowed), generates the take id and its `raw_key`, calls `CreateMultipartUpload` (content type set), then inserts `takes` and `uploads` (with that `r2_upload_id`) in one transaction. If the transaction fails it calls `AbortMultipartUpload` before answering 500; anything that slips through is cleared by the R2 lifecycle backstop. Returns `takeId`, `partSize` (67,108,864), `partCount`.
3. Browser asks `POST /api/takes/:id/upload/parts` for up to 20 part numbers at a time and sends each with `XMLHttpRequest` (for upload progress events), reading the `ETag` header. Four parts in flight. Progress = confirmed bytes plus the bytes of parts in flight.
4. After each confirmed part, the browser calls `PATCH /api/takes/:id/upload` with `bytesUploaded`; the server keeps the larger of the stored and sent values and bumps `last_activity_at`.
5. Part failure: retry after 1, 2, 4, 8, 16, 30, 30, 30 s. When the failure is ambiguous (network error or timeout with no response from R2, so the part may have landed), the browser first calls `GET /api/takes/:id/upload/parts`; if the part is listed at its expected size it counts as confirmed and is not sent again (AC-5). Failures with an R2 response (4xx, 5xx) retry directly. While `navigator.onLine` is false the row shows `Paused` and retries wait for the `online` event, without counting attempts. After 8 failures while online, the row shows `Failed` (`storage_unreachable`) with "Resume". Because `navigator.onLine` can stay true while the internet is down (connected to the router, no route out), the tab keeps retrying that part every 60 s while it stays open, and on the `online` event; the first success clears `Failed` and the upload carries on by itself.
6. Presigned URLs last 1 hour. On a 403 from R2 the browser fetches a fresh URL once for that part without counting an attempt; a second 403 counts as a normal failure (a 403 can also mean a CORS or clock problem). The S3 client is created with `requestChecksumCalculation: "WHEN_REQUIRED"` so presigned part URLs carry no checksum parameters R2 or the CORS policy would reject.
7. When all parts are confirmed: `POST /api/takes/:id/upload/complete`. Server calls `ListParts` (paging through all results), checks part numbers 1..N are all there, every part except the last is exactly `part_size_bytes` and the sizes add up to `size_bytes`, then `CompleteMultipartUpload` with R2's ETags, `HeadObject` to confirm size, then in one database transaction sets `status = completed`, `completed_at` and enqueues `take.probe` (pg-boss `send` with the transaction's `db` option, so both happen or neither). `take.probe` has its own queue, separate from the pipeline, so a probe never waits behind a 30 minute run. Calling it again on a completed upload returns 200 with no side effects. **Recovery**: if R2 completed the upload but the process stopped before the transaction committed, the row is still `in_progress` and R2 now answers `NoSuchUpload`. So whenever any route or the expiry sweep gets `NoSuchUpload` for an `in_progress` upload, it first calls `HeadObject` on `raw_key`: when the object exists and its size equals `size_bytes`, it runs the same completion transaction (status `completed`, probe enqueued); only when there is no such object does it mark the upload `aborted` with `expired`. Responses: `complete` answers its normal 200 `{ state: "checking" }` (or 409 `{ error: "upload_expired" }`); every other upload route (`GET` and `POST` parts, `PATCH`, `POST` resume) answers 409 `{ error: "upload_completed" }` or 409 `{ error: "upload_expired" }` instead of its usual body. The uploader treats `upload_completed` as done: it stops sending, drops its local state and refetches the take list, where the row shows `Checking`; `upload_expired` shows the `expired` failure.
8. Worker `take.probe`: ffprobe on a presigned GET URL (5 minute expiry; ffprobe reads only what it needs with range requests). Writes `duration_ms`, `width`, `height`, `fps`, `video_codec`, `probed_at`, or sets `failure_code` (`too_long`, `unreadable`). Retries twice on network errors (R2 unreachable, timeouts); after that it gives up without setting a `failure_code`, so the take stays `Checking`. Only an ffprobe parse result (no video stream, unparseable container) sets `unreadable`. A sweep every 10 minutes re-enqueues any take completed more than 10 minutes ago and still unprobed with no `failure_code`, so a probe that failed on the network runs again once R2 is reachable. When the probe succeeds and feature 7 has shipped, it writes the probe result and queues the pipeline run in one database transaction (the run row and the pg-boss job, sent with the transaction's `db` option), through the same queueing helper the web app uses (spec 0001, *Pipeline*). From Slice 3 that helper checks for a background first: with none, no run is queued and the take shows `Needs background`. A crash therefore leaves either an unprobed take (picked up by the sweep) or a probed take with its run, never a probed take silently missing one. In Slice 1 it stops here.

**Resume after reload** (AC-6): `Interrupted` rows come from the take list (status `in_progress` and not being sent by this tab). Resume first calls `GET /api/takes/:id/upload/parts` and compares each listed part's size with its expected size (`part_size_bytes`, or the remainder for the last part). When R2 already has every part at its expected size, it goes straight to complete without asking for the file. Otherwise it opens the picker, compares the fingerprint, sets the shown percentage from the correctly sized parts, and sends the missing and wrongly sized parts from step 3 (uploading a part number again replaces it in R2). Resuming a `parts_missing` upload first calls `POST /api/takes/:id/upload` to reopen it (status back to `in_progress`), since the parts routes answer 409 for a `failed` upload; the same comparison then runs. When `lastActivityAt` from the take list (`uploads.last_activity_at`) is under 2 minutes old, Resume first asks "This take may still be uploading in another tab. Resume here anyway?"

**Library row** (DESIGN.md *Take row*: 32 px, neutral fill, title in body md, mono duration and state at the right edge):

| State | Right edge text | Extras |
|---|---|---|
| Uploading | `Uploading 43%` | 2 px Verdigris progress fill at the bottom; cancel (×) on hover |
| Paused (offline) | `Paused 43%` | fill stays; cancel on hover |
| Interrupted | `Interrupted 43%` | "Resume" and cancel on hover |
| Queued (browser only) | `Queued` | cancel on hover removes it from the queue |
| Checking | `Checking` | no percentage (ffprobe reports none and takes seconds) |
| Uploaded | `12:34  Uploaded` | |
| Failed | peach glyph + `Failed` | Selecting it shows the message and its next step ("Resume", "Remove") in the stage |

Percentages are whole numbers and never go backwards. The row's state is also exposed as text for screen readers (`aria-label`, e.g. "Take 3, uploading, 43 percent").

**API surface**:

| Endpoint | Method | Key inputs | Key outputs | Auth | Key errors |
|---|---|---|---|---|---|
| `/api/takes` | GET | `cursor?` (opaque), `limit?` (max 50) | `{ takes: [{ id, title, durationMs, state, bytesUploaded, sizeBytes, failureCode, fingerprint, lastActivityAt }], nextCursor }`; `lastActivityAt` is `uploads.last_activity_at` (ISO time, null once completed), used by the resume warning; `state` is one of `interrupted`, `checking`, `uploaded`, `failed` in Slice 1 (the browser shows `interrupted` as `Uploading` or `Paused` when this tab is sending it); `failureCode` is `uploads.failure_code`, else `takes.failure_code` | person | 401 |
| `/api/takes` | POST | `filename: string`, `sizeBytes: number`, `contentType: string`, `lastModified: number`, `sample: string` (64 lowercase hex chars, the SHA-256 described in the data model sketch), `durationMs?: number`; the server builds `takes.fingerprint` from these | `{ takeId, partSize, partCount }`, 201 | person | 400 wrong type or bad `sample`, 413 over 25 GB, 422 over 30 min, 502 R2 error |
| `/api/takes/:id/upload/parts` | POST | `partNumbers: number[]` (1 to 20 of them) | `{ urls: { [partNumber]: url } }` | owner of take | 404, 409 not in progress, 400 bad part numbers |
| `/api/takes/:id/upload/parts` | GET | none | `{ parts: [{ partNumber, size }] }` from `ListParts` | owner of take | 404, 409 not in progress, 409 `upload_completed` or `upload_expired` (see *Recovery*) |
| `/api/takes/:id/upload` | PATCH | `bytesUploaded: number` | 204 | owner of take | 404, 409 not in progress |
| `/api/takes/:id/upload/complete` | POST | none | `{ state: "checking" }` | owner of take | 404, 409 aborted, 422 parts missing (sets `parts_missing`) |
| `/api/takes/:id/upload` | DELETE | none | 204 (aborts the multipart upload, deletes the take) | owner of take | 404, 409 already completed |
| `/api/takes/:id` | DELETE | none | 204 (deletes the R2 objects and the take) | owner of take | 404, 409 unless its state is `failed` (removing healthy takes is not in scope; interrupted ones use the cancel route) |
| `/api/takes/:id/upload` | POST | none | `{ partSize, partCount }` (resumes a `parts_missing` upload) | owner of take | 404, 409 not `parts_missing` |

The library learns about probe results by refetching the take list when the tab regains focus and every 3 s while any row is `Checking`. In Slice 2 this becomes the SSE stream from spec 0001.

**Value sourcing**:

| Action | Value | Source |
|---|---|---|
| Row title | title | filename without its last extension, set at `POST /api/takes`, stored in `takes.title` |
| Row percentage | NN% | live: bytes confirmed plus in flight in this tab; after reload: `uploads.bytes_uploaded / takes.size_bytes`, rounded down |
| Row duration | `12:34` | `takes.duration_ms` from the probe; before the probe, nothing is shown |
| Row state | label | spec 0002 *Library state* rule, plus the live tab state for `Uploading` and `Paused` |
| Part size, count | 64 MB, `ceil(size / 64 MB)` | spec 0001 decision; computed at `POST /api/takes` |
| Allowed types | mp4, m4v, mov | this spec (extension check; `contentType` stored as sent, defaulting to `video/mp4` or `video/quicktime` by extension) |
| Size limit | 25 GB | `MAX_TAKE_BYTES` in `packages/media`, shared by browser, web app and worker |
| Duration limit | 30:00 plus 1 s grace | scope product decision; `MAX_TAKE_MS` in `packages/media` |
| Resume match | fingerprint | `takes.fingerprint` vs the picked `File`'s name, size, `lastModified` and the SHA-256 of its first and last 4 MB |
| Which parts to send on resume | missing or wrongly sized parts | R2 `ListParts` compared with the expected size of each part |
| Expiry | 7 days idle | `uploads.last_activity_at`, swept daily by the worker; R2 lifecycle rule (14 days from start) as backstop |

**Key invariants**:
- The web app never receives video bytes; only R2 does.
- A take is `completed` only when R2 holds an object whose size equals `takes.size_bytes`.
- Presigned URLs are signed for one key and one part number, for one hour, and only for the owner of that take.
- At most one `take.probe` job per take is queued or running (pg-boss singleton key).

**Security model**: Every endpoint requires a session and owner checks the take (404 otherwise). Presigned part URLs are scoped to the take's key and expire after an hour; the bucket stays private. Size and type are checked in the browser for speed and again on the server for safety; the real duration is checked by the worker. Filenames are stored as text and only ever rendered escaped.

**Configuration required**:
- No new environment variables (R2 variables are in spec 0001).
- Toyin, in Cloudflare: the CORS policy from spec 0001's setup list (needed for direct uploads), plus a lifecycle rule on `take-studio-dev` that aborts incomplete multipart uploads after 14 days. R2 counts from when the upload started, not from its last activity, so it is only a backstop; the app's own 7 day idle sweep is the real expiry.

**Critical test scenarios**:
- Happy path (Playwright on dev with a small sample MP4, plus one manual 30 minute run on dev for AC-12): upload, percentage climbs, row reaches `Uploaded` with the right duration, verifies **AC-1**, **AC-4**, **AC-8**, **AC-12**.
- Resume maths (Vitest in `packages/media` or the web upload module): given a file size and a `ListParts` result, the parts to send (missing or wrongly sized) and the confirmed byte count are right, including the short last part, verifies **AC-5**, **AC-6**.
- Completion check (Vitest with a stubbed S3 client): a missing part or wrong total size returns 422 and sets `parts_missing`; a repeat complete call on a completed upload is a no op; `NoSuchUpload` with a matching object completes the upload, and without one marks it `expired`, verifies **AC-8**, **AC-9**.
- Probe (Vitest on the worker's ffprobe parsing): a 31 minute duration sets `too_long`; output with no video stream sets `unreadable`; exhausted network retries leave no `failure_code`, so the sweep picks the take up again, verifies **AC-9**.
- Permission: person B asking for part URLs on person A's take gets 404, verifies **AC-11**.
- Offline (manual on dev, recorded in the PR Proof): switch the network off mid upload, row shows `Paused`, switch it on, upload finishes, verifies **AC-5**, **AC-12**.

## Build plan

Tracer Bullet: one file all the way from the browser to R2 to the worker and back to the row first, then resume and failures.

1. Spec 0002 upload migration (`takes`, `uploads`) and the owner scoped take list with the Slice 1 library states, satisfies **AC-11**.
2. Thin path: `POST /api/takes`, part URL signing, `complete`, and a bare browser uploader (one file, parts in sequence) that ends with an R2 object and a `completed` row, satisfies **AC-1**, **AC-8**.
3. Worker `take.probe` on its own queue with ffprobe on a presigned GET, enqueued in the same transaction as completion, writing duration and failure codes, plus the stuck probe sweep and the library refetch while `Checking`, satisfies **AC-3**, **AC-8**, **AC-9**.
4. Library panel UI: rows in every state with the progress fill, "Upload take", drop zone, multi file queue, empty state, cursor pagination, satisfies **AC-1**, **AC-4**, **AC-11**.
5. Robust uploader: four parts in flight, retry and backoff, offline pause, URL refresh on 403, `bytesUploaded` saves, `beforeunload`, satisfies **AC-5**, **AC-7**.
6. Resume after reload with the fingerprint check, `GET` parts, straight to complete when nothing is missing, the other tab warning, resume on a matching drop, and the `parts_missing` resume, satisfies **AC-1**, **AC-6**, **AC-9**.
7. Cancel and remove (abort multipart, delete objects and row), browser side validation toasts, and the daily expiry sweep in the worker, satisfies **AC-2**, **AC-9**, **AC-10**.
8. Dev run of a 30 minute take with the network switched off and on, recorded as Proof in the PR, satisfies **AC-12**.

## Consequences

**Positive**:
- Uploads survive drops, reloads and expired URLs without starting again.
- No video bytes pass through the web app, so its memory and Railway bandwidth stay small.
- The worker path from R2 to Postgres is proven in Slice 1.

**Negative / tradeoffs**:
- Resume after a reload needs you to pick the same file again; browsers do not let a page reopen a file by itself.
- One file at a time is slower in total than parallel files on a very fast uplink.
- MKV, AVI and other containers are refused even though ffmpeg could read some of them.

**Neutral**:
- An interrupted upload keeps its parts in R2 (and costs storage) for up to 7 days.
- `Checking` has no percentage; it lasts seconds, so it is a label, not a progress bar.

## Follow-up

- [ ] Confirm with Toyin that MP4 and MOV cover what the camera records.

## References

**Design references** (Mobbin; `DESIGN.md` wins on look and behaviour):
- [Zoom, upload video as clip](https://mobbin.com/screens/42268236-8e19-4709-8369-88695d6ab52a): filename, bytes sent of total and a percentage on one row, cancel beside it.
- [Lyssna, recording upload in progress](https://mobbin.com/screens/7b0fba2a-002d-4554-b2f9-cc393313fd02): the upload lives in the list next to other items with a thin progress bar and "Cancel upload".
- [VEED, uploading badge](https://mobbin.com/screens/508ffdf8-be2b-4cb1-8982-5f820a64d007): a compact "13% Uploading" label, number first, which is the pattern for our mono right edge text.
- [Glassdoor, upload failed](https://mobbin.com/screens/bfbc8fe8-732e-4735-b244-5dc071120a0a): the failure names the cause and offers the two next steps (try again, use another file).
- [Skillshare, lesson list](https://mobbin.com/screens/296cbc25-e43d-4a14-959d-ef91e20a46a5): dense dark list with the duration aligned at the right edge and the selected row filled.
- [Frame.io, asset view](https://mobbin.com/screens/97a0ef5a-1b3f-4678-b9aa-a258858204be): dark media workspace showing source filename and status as plain fields.

Not followed on purpose: modal upload dialogs (Zoom, Descript) and the spinner on "Processing" (Synthesia). Uploads stay in the library rows, and progress is always a number.
