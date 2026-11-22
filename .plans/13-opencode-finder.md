# 13 — Finder search with OpenCode Go (no web search)

**Authorization override:** for THIS plan only, the owner approved editing B's `src/core/finder/**`, `src/core/ai/index.ts`, `src/core/index.ts` and adding tests under `src/core/**`. Everything else in `.plans/A-build-conventions.md` still applies (no commits, bun only, never `pkill -f`). Do not change `src/core/contracts.ts`.

Read first: `.plans/A-build-conventions.md`, `Design.md` §3 and §7.3 (pipeline + grounding), `src/core/finder/index.ts`, `extract.ts`, `verify.ts`, `rank.ts`, `webFetch.ts` (`fetchUniversityPages`), `detail.ts` (`detailProvider`, OpenCode fallback), `src/core/ai/{index,opencode,types}.ts`, `src/core/grounding/rorStore.ts` (`match`, `findByName`), `src/core/finder/pipeline.test.ts` (test style and fixtures).

## Problem
`finderSearch` requires an OpenRouter key and uses `client.search()` (Exa web search). The user's OpenRouter key is out of credit and they only have OpenCode Go (no web search; `OpenCodeClient.search` is a stub). Finder must work with OpenCode Go alone, and must honour the user's provider choice.

## Design (keep it grounded — Design §3)
OpenCode path, used when OpenRouter is not chosen/available:
- [x] 1. **Suggest names (AI, from memory, names only).** Ask the OpenCode model for up to ~24 real universities that offer programs matching the careers in the scope/filters/language profile. JSON schema (Zod, via `callJson`): `{ universities: [{ name, country }] }` — **names and countries only, no facts**. Add the prompt to `src/core/ai/prompts.ts` or a new `src/core/finder/suggest.ts`. Respond in English; scope = continent/countries/global from `SearchInput` (use `scopeToText`).
- [x] 2. **Ground in ROR.** Match each suggestion with `ror.match({ name, country })`; drop unmatched (count as removed); drop out-of-scope (`inScope`); dedupe by `ror_id`; keep at most `OPENCODE_MAX_UNIVERSITIES = 12` (put the constant in `config.ts`).
- [x] 3. **Fetch official pages.** For each kept record call `fetchUniversityPages(deps.http, record, program, logger)` (program = first career string) with a concurrency of 3 and a smaller page cap for search than for detail (add an optional `maxPages` parameter, default unchanged = 8; use 4 here). Emit `progress` events like `Reading official pages (3 of 12)…`. Skip records with no pages (count as removed).
- [x] 4. **Extract + verify with the existing code.** Build `hits` = all fetched pages. Run `extractCandidates` in batches of ~3 universities (their hits only, so the prompt budgets in `config.ts` hold), merge candidates, then `CitationIndex.fromHits(allHits)` and `verifyCandidates` exactly as the OpenRouter path does (same quote check; a fact without a verified quote becomes `null`). Then `rankVerified`, emit `result` events, cache via `deps.searches`, and emit `done` — same events/limits (`MAX_RESULTS`, `MIN_VERIFIED_RESULTS`/TOO_FEW) as today.
- [x] 5. Progress messages must keep the existing English patterns the UI translates (see `src/ui/screens/finder/progress.ts`) where they apply: `Searching the web…` is NOT used here; use new messages and add them to the UI map in step 8.
- [x] 6. **Provider choice.** New helper in `src/core/ai/index.ts`: `finderProvider(deps)`: if setting `default_provider === 'opencode'` and an OpenCode key exists → `'opencode'`; else if an OpenRouter key exists → `'openrouter'`; else if an OpenCode key exists → `'opencode'`; else throw `MissingKeyError('openrouter')`. Use it in `finderSearch` (branch to the OpenCode path or the existing OpenRouter path) and make `detailProvider` in `detail.ts` use the same preference rule. The "needs an OpenRouter key" error is now only emitted when NEITHER key exists — update the message constant `FINDER_NEEDS_OPENROUTER` usage accordingly (keep the export name; new text: "University search needs an AI key. Add an OpenRouter key (best, verified web search) or an OpenCode Go key in Settings.") and update any test that asserts the old text.
- [x] 7. Export new symbols from `src/core/index.ts` if the UI needs them.

## UI (A's area)
- [x] 8. `src/ui/screens/finder/progress.ts`: translate the new progress messages (en/es/vi in the `finder` namespace). `FinderForm`/Finder gate: Search is enabled when **either** key exists; the missing-key `ErrorNote` appears only when neither exists, with the new text (en/es/vi). When a search ends in an error, the Finder `ErrorNote` shows a secondary button "Search with {{provider}} instead" when the other provider has a stored key: sets `default_provider` via `setSetting` and re-runs the same search. (Provider names are brand constants.)
- [x] 9. Settings: the select currently labelled "Counselor provider" now governs the Counselor, the Finder and detail pages. Rename the label to "AI provider" and set the hint to: "Used by the Counselor, the Finder and university pages. OpenRouter gives verified web search; OpenCode Go reads each university's own site instead." (en/es/vi). Keep the setting key `default_provider`.
- [x] 10. A one-line note on the Finder results when the OpenCode path ran: "Found from universities' own pages. Results can be fewer than with web search." (en/es/vi), shown above the results when the provider used was OpenCode (the UI can know this from the setting + keys the same way; keep it simple: compute with the same rule in a small UI helper using `getSetting`/`getSecret`).

## Tests (bun test, same style as pipeline.test.ts; no network)
- [x] suggest → ROR match → fetch → extract → verify happy path with a fake `AiClient` and a fake `HttpClient` returning HTML containing the quotes.
- [x] Unmatched/out-of-scope suggestions are dropped and counted in `removed`.
- [x] A fact whose quote is not in the fetched page becomes `null` (never shown).
- [x] `finderProvider` rule table (setting × keys).
- [x] Existing 147 tests must still pass (update only tests asserting the old missing-key text).

## Verify
`bun run build`, `bun run check:i18n`, `bun test`, `(cd src-tauri && cargo check)`. Then add under "Requests" in `.plans/B-core.md` a short note listing exactly which core files changed and why, so B can review. Do not edit anything else in B-core.md.

## Builder notes

**Results**
- `bun run build`: pass. `bun run check:i18n`: pass. `bun test`: 159 pass, 0 fail (147 before; +12 new). `(cd src-tauri && cargo check)`: pass.
- `bunx tsc --noEmit -p .`: pass.
- `tauri dev` smoke run: NOT completed. Port 1420 was already held by an existing `tauri dev` session (pid 1089703, started about 14 min before my run). I did not kill it. Instead I asked that running Vite server to transform the 6 changed UI/core files: all returned HTTP 200.

**Done**
- Steps 1-7 (core): `pickFinderProvider` / `finderProvider` / pure `chooseFinderProvider` in `ai/index.ts`; new `finder/suggest.ts` (suggest, ROR ground, page fetch with `maxPages`=4 and concurrency 3, extract in batches of 3); `finderSearch` branches on provider and shares verify/rank/emit; `detailProvider` uses the same rule; `fetchUniversityPages` takes optional `maxPages`; exports in `core/index.ts`.
- Steps 8-10 (UI): Finder gate accepts either key; missing-key note only when neither exists; failed search shows "Search with {{provider}} instead" when the other key exists (sets `default_provider`, re-runs); OpenCode results show the own-pages note; Settings label "AI provider" + new hint; progress messages translated (en/es/vi).
- Tests: `finder/opencodeSearch.test.ts` (happy path, quote-missing → null, unmatched/out-of-scope removed and counted, provider rule table of 8 cases, OpenCode preference with both keys). `pipeline.test.ts` missing-key test now covers the no-keys case only.
- `.plans/B-core.md` Requests note added (only the Requests section; the older "Finder search requires OpenRouter" line is marked superseded in the note).

**Deviations**
- `OPENCODE_MAX_UNIVERSITIES` lives in `src/core/finder/suggest.ts`, not `config.ts` (config.ts was not in the authorization override).
- Extra progress message "Reading the pages for facts…" added before extraction (the plan asked for new messages; this one covers the extract stage).
- Failed-search note keeps "Try again" and adds the switch button beside it.
- Removed count on the OpenCode path = suggestions unmatched or out of scope + pages-less universities + verify removals + over-cap. Duplicate suggestions are not counted.
- Search cache is still keyed by input only, so a result set from one provider can be served to the other within the cache. Left as is.

**Not verified**
- No live OpenCode Go search run (no network/key in this run). The OpenCode path is covered only by the fake-HTTP tests.
- No visual check of the Finder error/switch buttons or the own-pages note in the running app.
- Spanish and Vietnamese copy is written by me; not reviewed by a native speaker.

