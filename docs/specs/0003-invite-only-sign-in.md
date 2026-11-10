# 0003 Invite only sign in

**Status**: Proposed
**Date**: 2026-11-09
**Scope feature**: 5. Invite only sign in (`docs/scope/scope.md`)

## Summary

People sign in with a link sent to their email (a magic link), and only addresses Toyin has invited can get one. Toyin is the owner, set by an environment variable, and is the only person who sees the People page in settings, where they can invite an email or remove a person. Removing someone ends their sessions at once and blocks new links, but keeps their takes. Every page and every API route checks the session, and every take lookup checks the owner.

## Context

Take Studio is for Toyin plus a few invited people, with no open sign ups (scope, _Product decisions_). Spec 0001 picked Auth.js with email magic links through Resend, and spec 0002 fixed the tables (`users`, `sessions`, `verification_tokens`, `invites`, `audit_events`, `rate_limit_hits`).

The open questions are how the invite list gates sign in, how the first owner exists before anyone can invite, what "remove" does to a person's data and live sessions, and how every route is protected. The forces are small scale (a handful of people), private footage (a leak is the worst outcome), and an email link flow that must not become a way to spam addresses or learn who is invited.

## Requirements

**User stories**:

- As an invited person, I want to type my email and get a sign in link so that I never manage a password.
- As Toyin, I want to invite and remove people from settings so that I control who can use the app.
- As anyone not invited, I should not be able to get in, or learn who is.

**Acceptance criteria**:

- **AC-1**: An invited email (or `OWNER_EMAIL`) entered on `/sign-in` receives an email "Sign in to Take Studio" with a link that signs them in and lands on the workspace. The link works once and expires after 15 minutes.
- **AC-2**: An email that is not invited receives no email. The response is the same as for an invited address (same redirect, same status, same page), both from the sign in form and from a direct request to `/api/auth/signin/resend`, and the attempt is logged as `sign_in.refused`.
- **AC-3**: Every page except the sign in pages, and every route under `/api` except `/api/auth/*` and `/api/health`, refuses a request without a valid session: pages redirect to `/sign-in?next=<path>`, API routes answer 401.
- **AC-4**: A signed in person can read and change only their own takes, settings and background. Asking for another person's take by id answers 404.
- **AC-5**: The owner sees a People page at `/settings/people` listing every invited email with its state (`Invited` or `Active`, with the date of first sign in) and can invite an email and remove a person. Anyone else gets 404 for that page and its API.
- **AC-6**: Inviting an email adds it to the list and sends a short invite email with a link to `/sign-in`. Inviting an email that is already invited only resends that email, at most once a minute.
- **AC-7**: Removing a person (after a confirm dialog) deletes their invite, all their sessions and every outstanding sign in link for their email (`verification_tokens` rows with that identifier) in one transaction; their next request is signed out, they cannot get a new link, and a link requested before removal (including one still being issued while the removal runs) stays dead even if they are invited again. Their takes and settings stay; inviting them again restores access to the same library.
- **AC-8**: The owner cannot be removed and does not appear as removable.
- **AC-9**: Sign in link requests are limited to 3 per email and 10 per IP address in any 10 minutes; past the limit the page says "Too many attempts. Try again in a few minutes." and no email is sent.
- **AC-10**: A used or expired link, or a link for someone removed since it was sent, shows "This link has expired or is no longer valid" with a button to send a new one. Opening the link in the email first shows a page with a "Sign in" button, so mail scanners that open links do not use it up.
- **AC-11**: A signed in person can sign out from the account menu; the session row is deleted and they land on `/sign-in`.

## Options considered

### Option 1: Auth.js magic links with an invite table checked in the `signIn` callback (chosen)

Auth.js (v5) with the Resend email provider, the Drizzle adapter and database sessions. The `signIn` callback allows only `OWNER_EMAIL` or an email in `invites`.

**Pros**:

- Already chosen in spec 0001; one library, data in our own Postgres.
- Database sessions make removal immediate.
- The callback runs before any email is sent, so uninvited addresses cost nothing.

**Cons**:

- Database session lookups on every request (one indexed query, fine at this scale).

### Option 2: Hosted auth (Clerk) with its allowlist

**Pros**:

- Allowlist, invites and session revocation come built in.

**Cons**:

- A second user store outside Postgres, another dashboard, and a monthly cost for a handful of people.
- Spec 0001 already ruled it the runner up.

### Option 3: Auth.js with JWT sessions

**Pros**:

- No session lookup per request.

**Cons**:

- A removed person keeps a valid token until it expires, which breaks AC-7.

## Decision

**Chosen option**: Option 1: Auth.js magic links with an invite table checked in the `signIn` callback.

Auth.js v5 (`next-auth@5`) in `apps/web` with the Resend provider, `@auth/drizzle-adapter` on the spec 0002 tables (custom tables passed to the adapter, camelCase property names in Drizzle as the adapter expects), `session.strategy = "database"`, sessions lasting 30 days and refreshed daily, magic links valid 15 minutes. The owner is whoever matches `OWNER_EMAIL`.

## Rationale

The invite list is just a table, so the simplest gate is the hook Auth.js already offers: `signIn` runs both when a link is requested and when it is used, and refusing there means no email goes out and a stale link for a removed person fails too. Database sessions are the only way to make "remove" mean "out now" without extra machinery; the cost is one primary key lookup per request.

Showing the same "Check your email" screen to invited and uninvited addresses keeps the list private. The price is that an uninvited person waits for an email that never comes, which is acceptable for an invite only tool whose people are told they were invited (AC-6 sends them an email).

Seeding the owner from `OWNER_EMAIL` avoids a setup script or a first user wins race on a fresh database, and makes the owner impossible to remove by accident.

## Feature design

**Data model sketch**: the spec 0002 tables `users`, `accounts`, `sessions`, `verification_tokens`, `invites`, `user_settings`, `audit_events`, `rate_limit_hits`. No new columns. Owner is derived: `isOwner(user) = user.email === normalize(OWNER_EMAIL)`, never stored.

**State transitions** (a person's access):
`not invited → invited` (owner invites) → `active` (first successful sign in after the invite sets `invites.accepted_at`; the very first one also creates the `users` row) → `removed` (owner removes: invite and sessions deleted, `users` row kept) → `invited` again (owner invites the same email). A removed person is shown nowhere; on re invite their row shows `Invited` until they sign in, then `Active`.

**Pages** (dark only, DESIGN.md tokens, one Verdigris button per view):

| Path                            | Shows                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `/sign-in`                      | App name, one email input, primary button "Send sign in link". Inline errors: invalid email, rate limited (AC-9). Signed in visitors are redirected to `/`.                                                                                                                                                                                                                                                                                                        |
| `/sign-in/check-email`          | "Check your email", the address in mono (read from a short lived `httpOnly` cookie the sign in action sets before calling Auth.js, never from the URL; omitted when absent), "The link works for 15 minutes." A "Send again" button enabled after 60 s with a mono countdown, and "Use a different email" back to `/sign-in`. Same screen for invited and uninvited (AC-2).                                                                                        |
| `/sign-in/confirm`              | Where the email link points: "Sign in to Take Studio as **name@example.com**" (the address in mono, so a link sent by someone else shows whose account it opens) and one "Sign in" button. The button is a form `POST` to `/api/sign-in/confirm` carrying the Auth.js callback URL from the query string (only accepted when its origin is `APP_URL` and its path is `/api/auth/callback/resend`). Opening this page does nothing on its own (AC-10).              |
| `/sign-in/error`                | For `Verification` and `AccessDenied` errors: "This link has expired or is no longer valid" and "Send a new link" (AC-10). Other errors: "Sign in failed. Try again."                                                                                                                                                                                                                                                                                              |
| `/settings/people` (owner only) | Ruled list of 32 px rows. The first row is always the owner (`OWNER_EMAIL`, labelled `Owner`, no actions); then each invite: email, state (`Invited` or `Active since 9 Nov`), "Resend" on invited rows, "Remove" on every row except the owner's. Above it an email input and "Invite" button. Remove opens a dialog: "Remove name@example.com? They are signed out now and can't sign in again. Their takes are kept." with a Burnt Peach "Remove" and "Cancel". |
| Account menu (workspace header) | The signed in email, "Settings", "People" (owner only), "Sign out".                                                                                                                                                                                                                                                                                                                                                                                                |

**API surface** (route handlers in `apps/web`; Auth.js owns `/api/auth/*`):

| Endpoint             | Method    | Key inputs                                                         | Key outputs                                    | Auth   | Key errors                                                      |
| -------------------- | --------- | ------------------------------------------------------------------ | ---------------------------------------------- | ------ | --------------------------------------------------------------- |
| `/api/auth/*`        | GET, POST | Auth.js (`signin/resend`, `callback/resend`, `signout`, `session`) | Auth.js                                        | public | rate limit message (429 text on our sign in form action)        |
| `/api/people`        | GET       | none                                                               | `[{ email, state, firstSignInAt, invitedAt }]` | owner  | 401, 404 for non owner                                          |
| `/api/people`        | POST      | `email: string` (req)                                              | `{ email, state }`, 201 new, 200 resent        | owner  | 400 invalid email, 409 is the owner, 429 resent within a minute |
| `/api/people/:email` | DELETE    | email in path (URL encoded)                                        | 204                                            | owner  | 404 not invited, 409 is the owner                               |
| `/api/health`        | GET       | none                                                               | `{ ok: true }`                                 | public | none                                                            |

The sign in form posts to a server action that validates the email and calls Auth.js `signIn("resend", { email, redirectTo: next })`. The rate limit is not in the action: it is in the `signIn` callback, so posting straight to `/api/auth/signin/resend` is limited too.

**Request guard**: Next.js middleware (or `proxy.ts` on Next 16) only checks that the session cookie is present and redirects or answers 401 when it is not (AC-3); it does not touch the database. Because middleware alone is not a security boundary, every server component, route handler and server action that touches data also calls `requireUser()` and, for owner routes, `requireOwner()` (404 for everyone else). Data reads then go through the spec 0002 owner scoped helpers (AC-4).

`requireUser()` resolves the session with `auth()` and then checks that the user is still allowed: their email equals `normalize(OWNER_EMAIL)` or has an `invites` row (one indexed lookup). When they are not, it deletes all of that user's sessions and answers as signed out (401 or redirect). This is the enforcement point for access, not the removal transaction alone: a session Auth.js creates in the gap between the link use invite check and a concurrent removal, or a former owner's session after `OWNER_EMAIL` changes, is refused and deleted on its first request.

**`signIn` callback** (in `apps/web/auth.ts`). Auth.js calls it twice: when a link is requested (`email.verificationRequest === true`) and when the link is used.

1. Both phases: normalise the email (trim, lowercase); allowed when it equals `normalize(OWNER_EMAIL)` or a row exists in `invites`.
2. Request phase, before the invite check: record a `rate_limit_hits` row for `email:<email>` and `ip:<ip>`; when either is over its limit return `/sign-in?error=rate_limited` (AC-9). Every attempt counts, invited or not, so the limit message reveals nothing.
3. Request phase, refused: write `sign_in.refused` and return the exact URL Auth.js redirects an allowed request to. Auth.js is configured with `pages.verifyRequest = "/sign-in/check-email"`, so allowed requests land there too; the build pins the Auth.js version, reads the allowed redirect (path and query) from it, and returns the same string, so the two responses cannot be told apart (AC-2).
4. Link use phase, refused (removed since the link was sent): return `false`, which lands on `/sign-in/error` with `AccessDenied` (AC-10). A session created anyway in a race with removal is caught by `requireUser()` (see _Request guard_).
5. Link use, token age: the adapter's `useVerificationToken` is wrapped. Before returning a token it computes the token's issue time (`expires − 15 min`) and, for anyone but the owner, returns `null` (Auth.js `Verification` error, AC-10) when the issue time is earlier than `invites.created_at`. A link requested under an old invite, even one whose token row was written after the removal transaction because the request was still in flight, can never sign in under a later invite.
6. `events.signIn` (after a successful link use) writes `sign_in.succeeded` and sets `invites.accepted_at` when it is null. Settings rows are created on first read by `getSettings` (spec 0002), not in an event.

The Resend provider's `sendVerificationRequest` is ours: it builds the email with the link pointing at `/sign-in/confirm?callback=<Auth.js URL>`.

**Callback guard (login CSRF)**: Auth.js consumes the token on a plain `GET` of its callback, so a link someone else requested could sign a person into the wrong account without the confirm page. The callback therefore only runs after the confirm step in the same browser. `POST /api/sign-in/confirm` rejects requests whose `Origin` is not `APP_URL` (403), checks the callback URL as above, sets a random single use nonce in an `httpOnly`, `Secure`, `SameSite=Strict` cookie (`ts_confirm`, path `/api/auth/callback/resend`, 60 s), appends the same nonce to the callback URL as `confirm`, and answers 303 to it. Middleware on `/api/auth/callback/resend` lets the request through to Auth.js only when the `confirm` parameter equals the cookie, then clears the cookie; any other request (a direct link, a mail scanner, a cross site navigation, a replayed URL) is redirected to `/sign-in/confirm?callback=<the URL without confirm>` and the token is untouched.

**Value sourcing**:

| Action                           | Value                    | Source                                                                                                                                                                                                                          |
| -------------------------------- | ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Decide who may sign in           | allow list               | `invites.email` plus `OWNER_EMAIL` env var                                                                                                                                                                                      |
| Decide who is owner              | owner                    | `OWNER_EMAIL` env var, compared lowercased                                                                                                                                                                                      |
| Show `Invited` or `Active since` | state, date              | `Active` when `invites.accepted_at` is set (date = `accepted_at`), else `Invited` (date = `invites.created_at`); the owner row comes from `OWNER_EMAIL`                                                                         |
| Validate an email                | valid or not             | trimmed, lowercased, at most 254 characters, `z.string().email()`                                                                                                                                                               |
| Inviter name in the invite email | name                     | the owner's `users.name`, else the owner's email                                                                                                                                                                                |
| Rate limit                       | counts                   | `rate_limit_hits` rows with key `email:<email>` or `ip:<ip>` in the last 10 min; IP is the address Railway's proxy adds (`x-real-ip`, else the last `x-forwarded-for` entry), never the first entry, which the browser can fake |
| Link expiry                      | 15 min                   | Resend provider `maxAge: 15 * 60`                                                                                                                                                                                               |
| Session length                   | 30 days, refreshed daily | `session.maxAge = 30 days`, `session.updateAge = 24 h`                                                                                                                                                                          |
| Email sender, links              | from address, base URL   | `EMAIL_FROM`, `APP_URL` env vars                                                                                                                                                                                                |
| Resend countdown                 | 60 s                     | constant in the check email page                                                                                                                                                                                                |
| Redirect after sign in           | target                   | `next` query param, accepted only when it starts with a single `/` (not `//` or `/\`) and resolves against `APP_URL` to the same origin; else `/`                                                                               |

**Emails** (sent through Resend, plain text plus simple dark HTML, no images):

- Sign in: subject "Sign in to Take Studio", one button "Sign in", the plain link below it, "This link works for 15 minutes and only once. If you didn't ask for it, ignore this email."
- Invite: subject "You're invited to Take Studio", "<inviter name> invited you to Take Studio.", a button to `APP_URL/sign-in`.

**Key invariants**:

- No email is ever sent to an address that is not invited and not the owner.
- A person with no `invites` row (and not the owner) has no session that `requireUser()` accepts; removal deletes their sessions, and any session that slips through a race is deleted on its first use.
- The owner is never in `invites` and can never be removed.
- Emails are compared lowercased and trimmed everywhere.

**Security model**: Owner: everything a person can do plus `/settings/people` and `/api/people`. Person: their own takes, settings and background only. Visitor: the sign in pages and `/api/health`. Auth.js handles CSRF on its routes, and session cookies are `httpOnly`, `secure`, `sameSite=lax`. Magic link tokens are stored hashed by Auth.js. Invite and remove actions, and every sign in success or refusal, are written to `audit_events`. Emails and IP addresses are personal data; nothing here is in a regulated scope. Secrets (`AUTH_SECRET`, `AUTH_RESEND_KEY`) come from Railway environment variables and are never logged.

**Configuration required**:

- `OWNER_EMAIL`: Toyin's sign in email; the owner and the first person who can sign in. New.
- `AUTH_TRUST_HOST`: `true` on Railway, so Auth.js trusts the forwarded host. New.
- `AUTH_SECRET`, `AUTH_RESEND_KEY`, `EMAIL_FROM`, `APP_URL`: already listed in spec 0001.
- Prerequisite (Toyin): a verified sending domain in Resend, already in spec 0001's setup list.
- Local development sends no real email: when `AUTH_RESEND_KEY` is not set, the link is printed to the web app log.

**Critical test scenarios**:

- Happy path (Playwright smoke with the email captured from the dev log): owner signs in, invites a second email, the second email signs in and lands on the workspace, verifies **AC-1**, **AC-5**, **AC-6**.
- Refusal (Vitest against the pinned Auth.js version): for an invited and an uninvited email, both through the sign in action and a direct POST to `/api/auth/signin/resend`, the status and `Location` header are identical; the uninvited one writes `sign_in.refused` and the mailer is not called, verifies **AC-2**.
- Callback guard (Vitest on the route and middleware): a direct `GET` of a valid callback URL redirects to `/sign-in/confirm` and leaves the token in `verification_tokens`; a `POST` to `/api/sign-in/confirm` with a foreign `Origin` answers 403; the confirm `POST` followed by the redirect signs in once, and replaying the same URL is redirected again, verifies **AC-10**.
- Removal (Vitest against Postgres): removing a person deletes the invite, their sessions and their `verification_tokens` in one transaction; their next `requireUser()` fails; after inviting them again, the old token is still refused. In flight variant: hold a link request after its invite check, run the removal and a re invite, then let the token be written; using that link fails with `Verification`, verifies **AC-7**, **AC-10**.
- Stale session: a session row for a user with no invite (the race, or a former owner after `OWNER_EMAIL` changes) is refused by `requireUser()` and deleted, verifies **AC-3**, **AC-7**.
- Owner protection: `DELETE /api/people/<owner email>` answers 409, verifies **AC-8**.
- Rate limit: the fourth request for one email in 10 minutes is refused with no email sent, verifies **AC-9**.
- Permission: a non owner calling `GET /api/people` gets 404; an unauthenticated `GET /api/takes` gets 401, verifies **AC-3**, **AC-5**.

## Build plan

Tracer Bullet: one thin path from the sign in page to a protected workspace first, then the owner tools.

1. Spec 0002 Slice 1 sign in migration (users, accounts, sessions, verification tokens, invites, user settings, audit events, rate limit hits), satisfies **AC-1**, **AC-7**.
2. `auth.ts` with the Resend provider (our `sendVerificationRequest`, 15 minute links, dev log fallback), Drizzle adapter, database sessions, the two phase `signIn` callback against `OWNER_EMAIL` and `invites`, and `events.signIn`, satisfies **AC-1**, **AC-2**, **AC-10**.
3. Request guard: cookie presence middleware plus `requireUser()` (with the per request invite check) and `requireOwner()`, and the safe `next` redirect, satisfies **AC-3**, **AC-4**, **AC-7**.
4. Sign in, check email, confirm and error pages, and the account menu with sign out, satisfies **AC-1**, **AC-2**, **AC-10**, **AC-11**.
5. Rate limit in the `signIn` callback with `rate_limit_hits`, and the daily pg-boss prune job in the worker, satisfies **AC-9**.
6. People page and `/api/people` (list, invite or resend, remove (invite, sessions and verification tokens) in one transaction with the confirm dialog, owner protected), with audit events, satisfies **AC-5**, **AC-6**, **AC-7**, **AC-8**.

## Consequences

**Positive**:

- Removing someone takes effect on their very next request.
- No passwords to store, reset or leak.
- The invite list stays private.

**Negative / tradeoffs**:

- Sign in depends on Resend delivering email; if Resend is down, nobody new can sign in (existing sessions keep working for 30 days).
- An uninvited visitor gets no feedback beyond "check your email".
- One session query and one invite lookup per request.

**Neutral**:

- Changing the owner means changing `OWNER_EMAIL` and redeploying. The former owner keeps access only if they are in `invites`; otherwise `requireUser()` signs them out on their next request.
- The People page is the only admin surface; there are no roles beyond owner and person.

## Follow-up

- [ ] Add `OWNER_EMAIL` and `AUTH_TRUST_HOST` to `.env.example` and the Railway `dev` environment (Toyin provides the value for `OWNER_EMAIL`).
- [ ] A refused request still returns slightly faster than one that sends an email; accepted for a handful of people.

## References

**Design references** (Mobbin, for the check email screen):

- [Miro, check your email](https://mobbin.com/screens/dac5a04a-0bcd-43f7-81f0-83532def11e8): the address shown back and a quiet "send link again" path.
- [Stripe, verify your email](https://mobbin.com/screens/b6feefd3-3f3d-40d9-96c6-a508a15d53b7): "Resend email" beside the main action and a way to change the address.
- [Base44, check your email](https://mobbin.com/screens/bcc04bb1-f24d-4f2b-879a-0b3c0766c6c9): "Didn't get the email? Resend" under the main action.

`DESIGN.md` wins on look: dark only, no illustration, one Verdigris button.
