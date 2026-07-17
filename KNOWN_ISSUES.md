# SoundProfile — Known Issues & Future Fixes

Snapshot from a backend/algorithm audit on **2026-07-18**. Nothing here is a
launch-blocking crash — the app works end-to-end and is live. These are the
real gaps, subtle bugs, and hardening items worth addressing over time, ordered
roughly by importance within each section.

Severity key: 🔴 blocker for a big public launch · 🟠 should-have · 🟡 minor /
cleanup · 🟢 fine for now, revisit at scale.

---

## Backend / algorithm

### 🟢 Recommendation engine recomputes from the whole dataset per request
- **Where:** `app/src/lib/api/recommend.functions.ts` → `getRecommendations`
- **What:** On every feed load it `SELECT`s *all* `user_songs` + *all*
  `user_instruments` into Worker memory and computes taste-similarity against
  every other user. O(all-users) work per view.
- **Impact:** Fine to low-thousands of users. Around ~10k users it degrades
  (Worker ~128 MB memory + D1 row-read limits) — only the feed slows; the rest
  of the app stays fast.
- **Fix:** Precompute/cache each user's picks (scheduled job or a cache table)
  so the feed just reads ~30 rows instead of scanning everyone.
- **Decision:** Deferred by owner until we actually approach that user count.
  Do **not** build preemptively.

### 🟡 Reputation drift on technique-tag takeover
- **Where:** `app/src/lib/api/annotations.functions.ts` → `saveAnnotation`
  (the `!isAuthor` takeover branch)
- **What:** When a user takes over a net-negative tag entry, its
  `annotation_votes` are deleted and the annotation's like/dislike counts reset
  to 0 — but the **previous author's** `users.likes_received` /
  `dislikes_received` counters are **not** decremented. Their lifetime
  reputation keeps points from votes that no longer exist.
- **Impact:** Small accounting inconsistency; arguably intentional (lifetime
  credit). Not a crash, not exploitable.
- **Fix (if wanted):** On takeover, subtract the wiped votes from the old
  author's counters in the same transaction.

### 🟡 Expired sessions are never pruned
- **Where:** `app/src/lib/session.server.ts` (`sessions` table)
- **What:** Sessions are validated with an expiry check but never deleted, so
  the table only grows.
- **Impact:** Harmless for a long time; slow unbounded growth.
- **Fix:** Periodic `DELETE FROM sessions WHERE expires_at <= datetime('now')`
  (cron/scheduled task, or opportunistically on login).

### 🟡 Avatars stored as data-URLs in the users row, re-read every session
- **Where:** `app/src/lib/image.ts` (`fileToAvatarDataUrl`, ~256px JPEG) →
  stored in `users.avatar_url` → `app/src/lib/session.server.ts`
  (`getSessionUser` SELECTs `avatar_url` on every authenticated request)
- **What:** Each server call that resolves the session re-reads the avatar's
  base64 bytes; a page hitting several server fns re-reads them each time.
- **Impact:** Works fine today; slightly wasteful. Matters only with many
  photo-having users.
- **Fix:** Move avatars to R2 (object storage) and store a URL, or stop
  selecting `avatar_url` in the hot session query and fetch it separately.

### 🟡 No automated test suite
- **What:** Confidence is from manual verification, not tests. A future change
  could regress something silently.
- **Fix:** Add tests around the highest-risk logic first — auth
  (`password.server.ts`, `session.server.ts`), reputation/ban
  (`annotations.functions.ts`, `rep.server.ts`), and the recommender
  (`recommend.functions.ts`).

**Audited and found HEALTHY (no action needed):** parameterized SQL everywhere
(no injection), PBKDF2 password hashing (100k iterations, per-user salt,
constant-time compare), `httpOnly`/`secure`/`sameSite` cookie sessions with
server-side expiry, ownership/reputation checks on all mutations (no IDOR
found), idempotent writes (`INSERT OR IGNORE` / `ON CONFLICT`).

---

## Launch readiness

### ✅ Password reset — DONE (recovery-code based, 2026-07-18)
- **Shipped:** `recovery.functions.ts` + `/reset` route + a "Generate recovery
  code" card in Profile + a "Forgot password?" link on login. Migration 0010
  adds `recovery_hash` / `recovery_salt` (hashed, single-use).
- **Deliberate choice:** recovery-CODE rather than email, because a secure email
  reset needs an external email provider (Resend/Postmark/etc.) + a verified
  sending domain, which requires an account only the owner can create. The
  recovery-code flow works today with zero infra.
- **Remaining limitation:** a user who never generated a code AND forgets their
  password is still stuck. If you later set up an email provider, add classic
  email reset (the reset endpoint/table can be reused) and keep recovery codes
  as a backup. Email verification is also still not implemented.

### ✅ Privacy Policy / Terms — DONE (2026-07-18)
- **Shipped:** `/privacy` + `/terms` routes, footer links on the landing page, a
  legal note on signup. **TODO for owner:** these are a reasonable baseline —
  have them reviewed and add a real contact email (currently "the site owner").

### ✅ QA account removed — DONE (2026-07-18)
- Migration `0012_remove_qa_account.sql` deletes `riff_qa_test` and all its rows.

### ✅ Abuse / report flow — DONE (2026-07-18)
- **Shipped:** migration `0011_reports.sql`; `reports.functions.ts`; Report
  buttons on comments and user profiles; a moderator-only `/moderation` page
  (linked from Profile for moderators) to review + resolve reports.
- **Still lightweight:** covers comments + users. Song annotations rely on the
  existing vote/takeover moderation. No email alerts to mods; they check the
  page. Fine for launch scale.

---

## Notes
- One shared D1 database backs both preview and production (the platform splits
  code, not data) — keep all migrations strictly additive.
- The Higgsfield platform **replaces** the app's `Content-Security-Policy`
  header with its own `frame-ancestors`-only policy, so `applySecurityHeaders`
  CSP directives don't reach the browser in production (verified 2026-07-18).
  Don't rely on the app's own CSP for security in prod.
