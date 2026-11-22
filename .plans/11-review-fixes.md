# 11 — Apply review fixes

Read first: `.plans/A-build-conventions.md`, then `.plans/10-review.md` (the review). Each item below refers to a numbered finding there; that file has the file:line, failure scenario and the suggested fix. Apply the fixes as described unless this plan says otherwise.

## Steps
- [x] 1. Finding 1 (Finder run id): apply the fix as written, including disabling "New search"/"Edit" while searching.
- [x] 2. Finding 2 (counselor retry duplicate): option (b), the UI-only workaround. Before a retry, delete the trailing stored user message of that session **only if** its `content` equals the encoded text being retried (compare exactly; select it first, then delete by id). Skip when the error was thrown before the core stored the message (missing key / "Complete onboarding" / unknown session). Then re-send. Also apply the same check to the resumed-session `pending` path. Add a short line under "Requests" in `.plans/A-frontend.md`: "B: `counselor.send` stores the student message before the AI call, so a retry after a failed call duplicates it. A works around it in the UI (deletes the trailing duplicate before retrying). A `send(..., { retry: true })` or storing only after success would be cleaner."
- [x] 3. Finding 3 (result row source markers): apply as written; export `SourceMarker` from `FactLine.tsx`; markers numbered in display order; clicks/keys on markers must not trigger row navigation.
- [x] 4. Finding 4 (clear data): apply as written: secrets first; then the DB deletes in **one** `db.execute` call containing all `DELETE FROM …;` statements separated by `;` (don't rely on BEGIN/COMMIT across the pool); in-memory resets in `finally`.
- [x] 5. Finding 5 (security):
      - `lib.rs`: restrict `secret_*` to accounts `openrouter` | `opencode` (the unit test must still pass — let the test use a `#[cfg(test)]`-only bypass or test against `opencode` while saving/restoring any existing value… simplest: allow `__uniworld_selftest__` only under `cfg(test)`).
      - `capabilities/default.json`: keep `https://*` for http (B needs it), remove the two redundant entries; replace `opener:default` with `opener:allow-open-url` scoped to `https://*` and `http://*` URLs.
      - `tauri.conf.json`: set `app.security.csp` to `"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost; worker-src 'self' blob:"` and `app.security.devCsp` to the same plus `http://localhost:1420 ws://localhost:1420` in `connect-src` and `'unsafe-eval'` NOT added. Run `tauri dev` and check the log for CSP violations (`Refused to`); if the globe, fonts, or the `universities.json` fetch are blocked, widen only the specific directive and note it.
- [x] 6. Findings 6–12: apply as written. For 10, format language codes with `languageName` both on the detail page and when rendering the language cell in My Unis (keep storing codes). For 11, reset the draft in the Settings "Edit profile" click handler and on Finish (not in an unmount cleanup).
- [x] 7. Finding 13: in `src/store/profile.ts` `save`, do the language delete + all inserts in one multi-statement `db.execute` (build `INSERT INTO profile_language (lang_code, level) VALUES ($1,$2),($3,$4)…`), and on any error call `load()` before rethrowing.
- [x] 8. Finding 14: add migration `src/db/migrations/003_tracked_detail_program.sql` (`ALTER TABLE tracked_uni ADD COLUMN detail_program TEXT;`), register version 3 in `lib.rs`, add `detailProgram` to `TrackedUni`, write it on add (= `detail.program`), and navigate to the detail page with `detailProgram ?? programName`.

## Slice checks
- Conventions' Verify passes (build, check:i18n, `bun test`, `cargo check`, and `cargo test` for the keychain test).
- `tauri dev` log: no `Refused to` CSP lines.

## Builder notes

**Verify results**
- `bun run build` (tsc + vite): passes. Only the known chunk-size warning.
- `bunx tsc --noEmit`: passes (after the last edit).
- `bun run check:i18n`: passes (6 namespaces, es and vi match en).
- `bun test`: 138 pass, 0 fail.
- `cargo check --offline`: passes. `cargo test --offline`: `keychain_roundtrip` passes.
- `WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 90 bun tauri dev`: runs for the full 90 s, no panic, no errors in the terminal log, and the process is gone afterwards. Run twice, once before and once after the `devCsp` change.
- CSP, dev: Vite dev page served through a scratch proxy with the `devCsp` header, loaded in headless Chromium. Before the hash below: 1 refusal (Vite's inline React-refresh preamble). After: 0 refusals.
- CSP, prod: `dist/` served with the `csp` header in headless Chromium: 0 refusals.
- Limit: the Tauri webview console is not in the terminal, and plain Chromium has no Tauri `invoke`, so the rendered app was not exercised in either check. A manual pass in `tauri dev` (globe, fonts, Finder, Settings > Clear all) is still needed.
- SQL: migrations 001 to 003 applied to SQLite with `bun:sqlite`; the new multi-row `profile_language` insert and the `tracked_uni` insert with `detail_program` run correctly.

**Deviations**
1. Step 2: not written into `.plans/A-frontend.md`. The conventions only allow editing this plan's file, so the orchestrator should add this line under Requests: "B: `counselor.send` stores the student message before the AI call, so a retry after a failed call duplicates it. A works around it in the UI (deletes the trailing duplicate before retrying). A `send(..., { retry: true })` or storing only after success would be cleaner."
2. Step 2 check, refined: the delete runs only when the newest stored row in the session is a `user` row whose `content` equals the text being retried. The plan's skip list (missing key / Complete onboarding / unknown session) was not used as the test. Reason: `createAiClient` (missing key) runs after the write, so a missing-key failure does store the message, and the content check handles that case while the skip list would not. The check is also applied to the resumed-session `pending` path. No retry test was added (not in the step list).
3. Step 5: `secret_*` allowlist is checked in `entry()`, which all three commands call first, not repeated in each command. The `devCsp` also has `'sha256-Z2/iFzh9VMlVkEOar1f/oSHWwQk3ve1qk/C2WdsC4Xk='`, the hash of Vite's React-refresh preamble. Without it, dev is blocked. It is dev-only; `csp` has no hash. No other directive was widened.
4. Step 6, finding 7: the hand-off is consumed with `navigate(pathname+search, { replace: true, state: null })`.
5. Step 6, finding 10: language codes are formatted on the detail page and in the My Unis language cell (new `display` prop on `InlineText`). Stored values are still codes.
6. Step 6, finding 11: Finish already reset the draft after navigating, so it is unchanged. The reset was added to the Settings "Edit profile" click, as the step says.
7. Step 6, finding 12: options come from the existing `countryOptions()` in `onboarding/options.ts` (same ISO list), not from `country-continent.json` directly. Countries already chosen are left out of the list, so the picker only adds. New keys `scope.addCountry` and `scope.noMatches` in en, es and vi.
8. Step 6, finding 6: `isWebUrl` lives in `src/lib/url.ts`. `factValue` (ResultRow) and `hasSourcedValue` (FactLine) both treat non-http(s) sources as missing, so the display and the marker numbering agree.
9. Step 6, finding 8: the WebGL context is released with `globe.renderer().forceContextLoss()` before `_destructor`. Not confirmed in the app; the review's "Too many active WebGL contexts" message was not reproduced.
10. Step 1: Edit and New search are disabled while a search runs (the step asks for this).
11. Step 4: in-memory resets run in `finally`, so if the DB delete itself fails, memory is cleared while the DB still holds the data. The step asks for this; the trade-off is noted, not fixed.
12. Step 7: one `DELETE` followed by one multi-row `INSERT`, not one multi-statement `execute`. Reason: binding parameters across statements in one `execute` is not verified for tauri-plugin-sql. Languages are de-duplicated in JS (lang_code is the PK). On any error the store reloads from the DB. A failure between the DELETE and the INSERT can still leave the list empty, so this is not fully atomic.
13. Step 8: `find(rorId, programName)` also matches `detailProgram`. Without that, after a rename "Add to my list" would show again and add a duplicate row.
14. Not done: the in-app checks in the review that need a running UI (Escape in My Unis, keyboard country picking, WebGL contexts). Those need a manual pass.
