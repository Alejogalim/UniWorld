# 10 - Review of Person A's UI (184e5ea..HEAD, branch feat/a-ui)

## Summary

Checks run on the current HEAD:

- `bun run build` (tsc + vite): passes. Only the usual chunk-size warning (index 1.09 MB, Globe chunk 2.0 MB, universities.json 11 MB).
- `bun test`: 138 pass, 0 fail.
- `bun run check:i18n`: passes (6 namespaces, es and vi match en).
- `cargo check --offline` in `src-tauri`: finishes clean.
- Extra: every static `t('...')` key used under `src/ui` and `src/app` exists in the en JSON. The dynamic keys (admission.*, status.*, filters.*, priorities.*, deadline.daysLeft_*) also exist.

The main flow is sound. Onboarding saves keys to the keychain only. Keys are never logged and never stored in SQLite. The `Fact` null and missing-source rule is enforced in `FactLine` and `factValue`. The Uni Manager sorts correctly and shows the badge under 30 days. SQL column names and `$n` placeholders match migrations 001 and 002. B's `CoreApi`, `MissingKeyError`, `FINDER_NEEDS_OPENROUTER` and the intake encoding are used correctly. No `dangerouslySetInnerHTML`. The globe tooltip escapes HTML. Filter defaults are correct (tuition-free off, spoken-languages on, need-to-learn off).

No blockers. The important findings are: stale Finder search events after "New search", duplicated student messages on counselor retry, result rows that show values without a source marker, a non-atomic "Clear all my data", and a missing CSP with an unrestricted keychain command.

Counts: blocker 0, important 5, minor 8.

---

## Important

### 1. Finder: a search cannot be cancelled, and late events corrupt the next state
- Severity: important
- File: `src/ui/screens/finder/useFinder.ts:92-128`, `src/ui/screens/finder/useFinder.ts:127`, trigger at `src/ui/screens/Finder.tsx:248`
- Problem: `search()` streams events into the store through `get()`/`set()` with no run id. `reset()` ("New search" button, shown while `phase === 'searching'`) sets `phase: 'idle'` and clears results but does nothing to the running core search. `resetFinderState()` (Clear all data) has the same problem. The guard `phase === 'searching'` is then false, so a second search can start while the first one is still running.
- Failure scenario: Student starts a search, clicks "New search" at once, picks other careers and searches again. Events from search 1 and search 2 interleave in `results`. Search 1's `done` event sets `phase: 'done'` while search 2 is still running. Even with no second search, search 1's `result` events re-fill the list and flip `phase` back to `done` after the student pressed "New search", so the two-column layout reappears.
- Fix:
  1. Add `let runId = 0;` at module level in `useFinder.ts`.
  2. In `search()`: `const id = ++runId;` right after the guard, and wrap `onEvent` as `const onEvent = (event) => { if (id !== runId) return; ... }`.
  3. After `await useCore().finder.search(...)` and in the `catch`, add `if (id !== runId) return;` before any `set`.
  4. In `reset` and `resetFinderState`, increment `runId` (`runId++`) so the old run is ignored.
  5. Optional: disable the "New search" and "Edit" buttons in `Finder.tsx` while `phase === 'searching'`.

### 2. Counselor "Try again" duplicates the student's message in the database
- Severity: important
- File: `src/ui/screens/counselor/useCounselor.ts:152-163` and `:240-245`; confirmed in `src/core/counselor/index.ts:45-47`
- Problem: `core.counselor.send` persists the user message first (`addMessage` before the AI call). On failure the UI keeps `pending` and `retry()` calls `runSend(pending)`, which sends the same text again, so a second identical `user` row is stored.
- Failure scenario: A network error on intake answer 3. The student clicks "Try again". `counselor_message` now has the answer twice. `studentCount` (counted from the DB in the `finally` block, line 196-200) is inflated, so "Show my career ideas" unlocks early. On the next launch `loadLatest` shows the answer twice. The AI history also contains the duplicate. Same with a resumed session whose last student message had no reply (`pending` built at line 373-388).
- Fix: Do not resend through `core.counselor.send`. Two options, the first is simplest:
  - (a) Make the retry path tell the core to skip persistence. Not possible without editing `src/core`, so instead ask B (see Requests in `A-frontend.md`) for `send(sessionId, text, onToken, { retry: true })` that does not call `addMessage` when the last stored message is already that user text.
  - (b) UI-only workaround: before retrying, delete the trailing duplicate with `getDb().execute("DELETE FROM counselor_message WHERE id = (SELECT MAX(id) FROM counselor_message WHERE session_id = $1 AND role = 'user')", [sessionId])` and then call `runSend(pending)`. Only do this when the failed attempt was already stored, which is always true for errors thrown after `addMessage`; skip the delete if the error is a missing-key or "Unknown session" error thrown before `addMessage` (message starts with `No AI key` or `Complete onboarding`).
  - Add a test in `intake.test.ts` or a new store test that a retry leaves exactly one user row.

### 3. Result rows show values with no source marker or link
- Severity: important (spec §3 "visible source links", task rule 2)
- File: `src/ui/screens/finder/ResultRow.tsx:361-409`
- Problem: The row renders `overview`, `languages` and `tuition` (all `Fact`s with sources) as plain text and badges. Only a count (`row.sources`) is shown. The student sees a tuition figure ("Free", "~EUR 12,000/yr") with no way to reach its quote or URL until the detail page is opened. `ResultRow` also does not use the `FactLine` or `SourceMarker` that the rest of the app uses.
- Failure scenario: A student screenshots the results list or reads "Free" in the demo video. The number has no visible provenance, which is the anti-goal in Design §3.
- Fix:
  1. In `src/ui/components/FactLine.tsx` export `SourceMarker` (add `export`).
  2. In `ResultRow.tsx` render `<SourceMarker index={n} sourceUrl={...} sourceKind={...} quote={...} />` next to the overview text, and inside or after the tuition badge, using `uni.overview.sourceUrl`, `.sourceKind`, `.quote` (only when `factValue(fact) !== null`). Number them 1, 2, 3 in the order shown.
  3. The row's outer `div role="link"` handles click and Enter/Space. Add `onClick={(e) => e.stopPropagation()}` and `onKeyDown={(e) => e.stopPropagation()}` on a wrapper span around each marker so opening the popover does not navigate. (The marker button already has its own click handler.)
  4. For languages, add one marker after the badge group using `uni.languages`.
  5. Where the value is missing, `tuitionUnknown` and `overviewMissing` are already shown. Keep them.

### 4. "Clear all my data" is not atomic and can leave the app in a split state
- Severity: important
- File: `src/ui/screens/settings/deleteAllData.ts:241-258`
- Problem: Steps run in this order: theme write, then 9 `DELETE`s one by one, then `deleteSecret` x2, then in-memory resets. If any step throws (for example the OS keychain is locked or `secret_delete` fails), the DB is already empty but `useProfile`, `useTracked`, the counselor and the finder stores still hold the old data, and the keys are still in the keychain. `DataSection` shows "delete failed" while the app visibly still has the profile. Clicking the button again works only partially.
- Failure scenario: Keychain locked on Linux or Windows credential store error. The student sees an error, but the SQLite data is gone; the sidebar still shows the old profile until a restart, at which point the app starts as a fresh install but with the keys still saved.
- Fix:
  1. Delete the secrets first (`await deleteSecret('openrouter'); await deleteSecret('opencode');`). If this fails, nothing else has been touched.
  2. Wrap the DB deletes in a single transaction: `await db.execute('BEGIN'); try { ... await db.execute('COMMIT') } catch (e) { await db.execute('ROLLBACK'); throw e }`. (tauri-plugin-sql with a pool may run statements on different connections; if BEGIN/COMMIT is unreliable, instead do the deletes in one `db.execute` with multiple statements separated by `;`, which sqlx runs in one call.)
  3. Put the in-memory resets in a `finally` block so they always run once the DB deletes were attempted.

### 5. No CSP, unrestricted keychain command, and a very wide HTTP scope
- Severity: important (security hardening; the webview talks to the keychain and to the whole internet)
- Files: `src-tauri/tauri.conf.json:21-23` (`"csp": null`), `src-tauri/src/lib.rs:11-33` (`secret_get/set/delete` take any `account: String`), `src-tauri/capabilities/default.json` (`http:default` allow `https://*`, plus `opener:default` which also grants `reveal-item-in-dir`)
- Problem: With no CSP, any injected script (for example from a future markup bug, or from AI/web text) can call `invoke('secret_get', { account: 'openrouter' })` and then `fetch` to any https host through the HTTP plugin, which exfiltrates the API key. The command also accepts any account name, so it can read other entries under the same keychain service. `opencode.ai/*` and `openrouter.ai/*` entries are redundant next to `https://*`. Today there is no XSS vector in the code (checked: no `dangerouslySetInnerHTML`, tooltip HTML is escaped), so this is defense in depth.
- Fix:
  1. In `tauri.conf.json` set a CSP, for example `"csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self' ipc: http://ipc.localhost; worker-src 'self' blob:"`. Run `bun tauri dev` and fix anything it blocks (globe.gl and framer-motion may need `'unsafe-inline'` styles; Vite dev needs `connect-src ws://localhost:1420` only in dev via `devCsp`).
  2. In `lib.rs` add `fn check(account: &str) -> Result<(), String> { if matches!(account, "openrouter" | "opencode") { Ok(()) } else { Err("Unknown key name.".into()) } }` and call it first in each `secret_*` command (and in `entry`).
  3. In `default.json` remove the two redundant URL entries (keep `https://*`, the app must fetch arbitrary university pages) and replace `opener:default` with `opener:allow-open-url` only (already listed), dropping the default set that adds `reveal-item-in-dir`. Keep the `allow-default-urls` scope or narrow it to `https://*` and `http://*` if `mailto:`/`tel:` are not needed.

---

## Minor

### 6. Opener accepts any scheme the plugin allows, with URLs that come from AI-extracted facts
- Severity: minor
- File: `src/ui/components/FactLine.tsx:127-132`, `src/ui/screens/UniDetail.tsx:247-252`
- Problem: `openUrl(sourceUrl)` and `openUrl(url)` are called with the fact's URL without a scheme check. The core validates that the URL is one of the search citations, but the UI does not enforce it. The opener default scope also allows `mailto:` and `tel:`, so a malicious page could surface a `mailto:` or `tel:` "source" that opens a mail or phone app. The `href` attribute also carries the raw value.
- Failure scenario: A fact with `sourceUrl: "tel:+100..."` renders a link that, when clicked, launches the dialer.
- Fix: Add `export const isWebUrl = (u: string) => /^https?:\/\//i.test(u);` in `src/ui/components/FactLine.tsx` (or a small `src/lib/url.ts`). Use it in `hasSourcedValue` (treat non-http(s) as unsourced, which renders "Not found - check official site") and guard both `openUrl` calls.

### 7. Career sent from the Counselor is re-added every time `CareerPicker` mounts
- Severity: minor
- File: `src/ui/screens/finder/CareerPicker.tsx:220-225`
- Problem: The effect reads `location.state.career` and calls `addCareer` on every mount. The router location state stays until another navigation. `CareerPicker` unmounts and mounts when the student presses "Edit" after a search, and when they come back from a detail page with `navigate(-1)`.
- Failure scenario: Student clicks "Find universities" on career A, removes chip A, types career B and searches. Clicking "Edit" remounts the picker and A is added again.
- Fix: After consuming it, clear the state: `const navigate = useNavigate();` then inside the effect `navigate(location.pathname, { replace: true, state: null });` after `addCareer(...)`. Or keep a module-level `let consumedKey: string | null` and compare with `location.key`.

### 8. WebGL context is not released when the globe unmounts
- Severity: minor
- File: `src/ui/globe/Globe.tsx:189-198`
- Problem: Cleanup calls `_destructor`, which runs `renderer.dispose()` but does not force context loss. The globe also remounts every time the Finder goes idle to split, to edit and back, and on every visit to the screen (it is a different tree position at `Finder.tsx:202-216` and in `FinderForm`).
- Failure scenario: After many searches and screen visits the browser logs "Too many active WebGL contexts. Oldest context will be lost" and the globe goes blank.
- Fix: In the cleanup, before `destroy?.call(globe)`, add `globe.renderer().forceContextLoss();` (globe.gl exposes `renderer()`). Optionally keep the globe in one stable tree position in `Finder.tsx` so it is not remounted on layout change.

### 9. Escape in My Unis inline editors may still save through `onBlur`
- Severity: minor (verify in the app; browser-dependent)
- File: `src/ui/screens/MyUnis.tsx:264-277` (`InlineText`), `:336-368` (`ExamsCell`)
- Problem: Escape calls `setEditing(false)`, which unmounts the focused input. Chromium dispatches `blur`/`focusout` when a focused element is removed, and React 19 can still route that to `onBlur={commit}`, which then saves the draft that the student just cancelled.
- Failure scenario: Student edits the program name, presses Escape expecting to cancel, and the new text is saved.
- Fix: Add `const cancelled = useRef(false);`. In the Escape branch set `cancelled.current = true` before `setEditing(false)`. In `commit`, start with `if (cancelled.current) { cancelled.current = false; return; }`. Reset `cancelled.current = false` when opening the editor. Do the same in `ExamsCell`.

### 10. Languages are shown as ISO codes on the detail page and in the tracker
- Severity: minor
- File: `src/ui/screens/UniDetail.tsx:235` (FactLine for languages has no `format`), `:119` (`language: ...join(', ')` stored as codes)
- Problem: `FactLine` joins the raw array, so the student sees "en, de" in the detail page and in My Unis. The Finder row uses `languageName`, so the app is inconsistent.
- Fix: Pass `format={(codes) => codes.map((c) => languageName(c, uiLang)).join(', ')}` to the languages `FactLine` (import `languageName` from `@/ui/data/languages`). For the tracker, store the names in the current UI language only if desired, otherwise leave codes and format them in `MyUnis.tsx` where `language` is rendered; the value is user-editable text, so storing localized names is acceptable.

### 11. Onboarding draft and typed keys linger in memory after leaving the screen
- Severity: minor
- File: `src/ui/screens/Onboarding.tsx:48-54`, `src/ui/screens/onboarding/useOnboardingDraft.ts:588-605`
- Problem: The draft is only reset on Finish or after clearing data. Opening Settings > "Edit profile", typing a key, then leaving through the sidebar keeps `openrouterKey`, the step number and `prefilled: true`. The next "Edit profile" opens on the stale step with the old draft and the typed key. Keys are in memory only (not persisted), but they stay longer than needed.
- Fix: In `OnboardingScreen`, add `useEffect(() => () => { if (!finishedRef.current) useOnboardingDraft.getState().reset(); }, []);` with `finishedRef` set to true right before `navigate` in `finish`. Note that the StrictMode double mount calls the cleanup once in dev; guard with a ref that is set on first real use, or reset in the "Edit profile" click handler instead (`useOnboardingDraft.getState().reset()` before `navigate`).

### 12. Countries can only be selected with the mouse on the globe
- Severity: minor (accessibility)
- File: `src/ui/globe/Globe.tsx:257`, `src/ui/screens/finder/ScopePicker.tsx`
- Problem: The scope "one or more countries" is only reachable by clicking a polygon in a canvas (`role="application"`). Keyboard and screen-reader users can use continents and the world chip but cannot choose a country.
- Fix: In `ScopePicker.tsx` add the existing `Combobox` (`src/ui/components/Combobox.tsx`) fed by `countryName` options built from `data/country-continent.json` codes; `onChange={(iso) => toggleCountry(iso)}`. Add the labels `scope.addCountry` and `scope.noMatches` to the finder namespace in en, es and vi.

### 13. `profile.save` is not transactional
- Severity: minor
- File: `src/store/profile.ts` (save: upsert, then `DELETE FROM profile_language`, then one INSERT per language)
- Problem: If an INSERT fails (for example a duplicate code that slipped through) the profile row is already updated and the languages are gone. `Finish` shows an error and the user loses their language list.
- Fix: Build one multi-row insert after the delete in a single `db.execute`, or run the whole sequence inside `BEGIN`/`COMMIT` with rollback on error. Also catch the failure and reload with `useProfile.getState().load()` so the store reflects the database.

### 14. Opening a tracked university after editing its program name silently starts a live search
- Severity: minor
- File: `src/ui/screens/MyUnis.tsx:85-88`, `src/ui/screens/UniDetail.tsx:52`
- Problem: The detail route uses `uni.programName`, which the student can edit freely in the table. The cache key is `(ror_id, program_key)`, so an edited name is a cache miss: `core.finder.detail` runs a web search and AI calls (cost, key required), contradicting "reopens its detail page (from the cache)". Without a key, the page shows the missing-key error instead of the data they already had.
- Fix: Keep the original program as a separate immutable value. Cheapest: store it at add time in the `tracked_uni.notes`-independent way by adding a migration `003_tracked_detail_program.sql` (`ALTER TABLE tracked_uni ADD COLUMN detail_program TEXT;`), registering it in `lib.rs`, writing `detail_program = detail.program` on add, and navigating with `?program=${uni.detailProgram ?? uni.programName}`. If a migration is too heavy, show a one-line hint in the table when the name was edited.

---

## Checked and found fine (no action)

- Keys: only `invoke('secret_*')`; nothing in SQLite, logs or persisted state. The draft keeps typed keys in memory only until Finish (see 11).
- `FactLine` renders "Not found - check official site" for null values and for a value without `sourceUrl` (`hasSourcedValue`); the marker numbering in `UniDetail` uses the same rule as `factValue`.
- Detail page: official/third-party tag, quote, URL, "Last checked", Refresh, Add to my list (idempotent `add`, `adding` guard).
- Finder missing-key text matches Design §5.1 exactly (`finder.key.message`); search is disabled when no OpenRouter key.
- Uni Manager: nearest deadline first, no-deadline rows next, passed deadlines last; urgent badge for 0-29 days; statuses in the Design order.
- SQL: tracked, settings, profile and counselor queries use existing columns and `$n` placeholders; the counselor role filter `'user'` matches B's store; session close uses `status = 'closed'`.
- Streaming: tokens update by message id; unmounting during a stream is safe because the state lives in the Zustand store.
- Globe: `_destructor`, `ResizeObserver` and listeners are cleaned up; the load promise is cancelled on unmount; theme re-skin works from tokens (no hard-coded colors in components).
- Styling: only the allowed `shadow-float` appears; the one gradient is the documented `.app-rail` in `src/index.css:271` (DESIGN.md should be checked by a designer if the rail gradient is outside "no gradients").
