# Fixes — Part B (Finder + AI JSON), written by A for B

Context: A wired the UI to B's real core and tested it with a real OpenCode Go key (the OpenRouter key was out of credit). Finder and the detail page both fail or return almost nothing. This file is what A found. **B owns the fixes**; A keeps working on the frontend and will adapt the UI to whatever B adds (see "UI needs").

## What A already changed in B's folders (please review)
Done earlier, with the owner's OK, to let the Finder work with OpenCode Go only (see `.plans/13-opencode-finder.md` and the note under Requests in `B-core.md`):
- `src/core/ai/index.ts`: `chooseFinderProvider` / `pickFinderProvider` / `finderProvider` (setting `default_provider` wins if its key exists, then OpenRouter, then OpenCode). `FINDER_NEEDS_OPENROUTER` text now says an OpenRouter **or** OpenCode key.
- `src/core/finder/suggest.ts` (new): the OpenCode path. The model suggests names, ROR grounds them, `fetchUniversityPages` reads the official pages, `extractCandidates` + `verifyCandidates` run as before.
- `src/core/finder/index.ts`, `detail.ts`, `webFetch.ts` (optional `maxPages` argument): small edits to use the above.
- Tests: 12 new, 159 total pass.
Feel free to restructure all of it. The path works mechanically but gives poor results (below).

## Symptoms reported (real runs, OpenCode Go key)
1. Finder "Robotics" in the **US**: `1 verified, 14 removed`. The single card (Carnegie Mellon) had an overview that was a ranking sentence ("Ranked No. 1 in nine undergraduate programs…"), tuition unknown, and the program name "Robotics" was never verified.
2. Finder "Robotics" in **Europe**: basically no results.
3. Opening CMU's detail page: **"This page could not load. The AI did not return valid JSON after one retry."**
4. Searches are slow (long wait, nothing shown until the end).

## Findings

### F1. No step finds the programme (evidence from a probe)
The OpenCode path only has the *university list* (ROR). It then fetches the homepage plus guessed admissions/fees pages and asks the model to extract. A probe (script below) ran `fetchUniversityPages(..., 'Robotics', undefined, 4)` against 8 real European universities, with no AI:
- Fetching is fine and fast: 2–4 pages per university in 0.7–3.8 s.
- But the pages are generic: homepage, tuition fees, admission letters, even TUM's *feedback* page and Edinburgh's *unsuccessful applicants* page.
- Pages mentioning "robot": Delft 2 (incidental), KTH 1 (a contact page), TU/e 1 (admissions page), **TUM, Aalto, ETH, Polimi, Edinburgh: 0**.
The extraction prompt says "only include universities that offer a related program, using ONLY the provided text", so with no programme page the model correctly returns nothing. Same cause for the US result. OpenRouter web search does not have this gap because it searches for the programme.

### F2. JSON failures are lost, and the search path swallows them
- `callJson` (`src/core/ai/json.ts`) throws `AiFormatError(message, raw, issues)` but the UI only shows the message. The raw reply and the Zod issues are never surfaced.
- `extractCandidates` (`src/core/finder/extract.ts`) catches every error, logs it, and returns `[]`. A rejected AI answer therefore looks like "no candidates" and ends as "Couldn't verify enough results". **Part of the empty Europe/US results may be this**, not the pages.
- Likely causes of the rejected JSON (unconfirmed, needs the raw reply):
  1. OpenCode's model is a reasoning model: reasoning eats `max_tokens` (detail uses 3000, extraction 4000), so `message.content` is empty or cut off. `extractContent` in `src/core/ai/transport.ts` reads only `message.content`.
  2. Shape mismatch: `languages` / `exams` must be arrays; a plain string fails the Zod check.
  3. Prose around the JSON. (`stripFences` handles fences and the outermost `{…}`, so this is the least likely.)
- The retry appends the bad reply and asks again with the **same** token limit, so a truncation just repeats.

### F3. Language filter drops universities that don't state the language
`applyFilters` in `src/core/finder/verify.ts`: with `spokenLanguagesOnly` (default on), a university whose `languages` fact is `null` is removed. US sites rarely write "taught in English" (it is implied), so the quote check cannot pass and they are dropped silently.

### F4. Program name is unverified
`UniResult.program` comes from the model (`candidate.programName`) and is not checked against any fetched page. Result: "Carnegie Mellon / Robotics" with no evidence that the programme exists.

### F5. Slow
- The OpenCode path does: suggest (1 call) → fetch all → extraction in sequential batches of 3 universities → verify → rank. Nothing is emitted until the end.
- Extraction budgets: 3 universities × up to 4 pages × 6000 chars exceed `EXTRACT_MAX_TOTAL_CHARS` (60 000), so the third university's pages are truncated out of the prompt.
- Fetching was fast in the probe (about 1–4 s per university from Bun). Re-measure inside the app (Tauri http plugin may differ). Most of the wait is probably the sequential LLM calls.

## Fix plan, in order

### 1. Make AI failures visible (small, do first)
- Keep `raw` and `issues` from `AiFormatError`; log them (`logger.error`) with the first 500 chars of `raw`.
- `extractCandidates`, `planQueries`, `rankVerified`: do not swallow silently. Count failures and report them (see UI needs).
- Add a CLI debug flag (e.g. `--debug`) to `scripts/search.ts` that prints raw replies and Zod issues. With it, run `bun run scripts/search.ts "Robotics" US --detail <ror id> --refresh` using only `OPENCODE_API_KEY` in `.env` to reproduce F2 without the UI.

### 2. Make JSON extraction robust (OpenCode and OpenRouter)
- In `transport.ts`, also read `reasoning_content`/`reasoning` only to detect an empty `content`; never use it as the answer. If `content` is empty and the finish reason is `length`, retry with a larger `max_tokens` (e.g. double, cap 8000).
- Raise token limits for the JSON calls (detail, extraction, rank). Add "Respond with the JSON object only. No reasoning, no commentary." to the system prompts, and send `response_format: json_object` where supported (OpenCode client already falls back on HTTP 400).
- Zod tolerance: for `languages` and `exams` accept a string and coerce to a one-item array (`z.preprocess`); accept `null` for missing facts everywhere.
- In `callJson`, on the retry send the Zod issues (already done) **and** a larger `max_tokens` when the first reply was truncated/empty.
- Tests: raw replies that are empty, truncated, fenced, wrapped in prose, with string-for-array, with a second JSON block.

### 3. Programme discovery (fixes F1, F4)
New step in the OpenCode path (and usable as a fallback for OpenRouter):
1. **Expand careers to degree keywords.** One small AI call (names only, no facts): "Robotics" → Robotics, Mechatronics, Automation, Mechanical engineering, Computer science, AI. The Counselor already produces `degreeKeywords`; pass them through `SearchInput` if the UI can (contract change, see below) or derive them here.
2. **Find the programme page on the university's own site** (allowed domains only, as `webFetch.ts` already enforces):
   - From the homepage, follow links toward Study / Bachelor's / Programmes A–Z / Degrees / Undergraduate; score by those words plus the keywords. Add US-style paths (`/academics`, `/admissions/undergraduate`, `/majors`, `/programs`, `/cost`, `/financial-aid`) and EU-style ones.
   - On a listing page, follow links whose text matches the keywords (depth ≤ 2), fetch the programme page.
   - Optional: ask the model for a programme URL on that domain and keep it only if the fetch succeeds and the text contains a keyword.
3. **Evidence gate.** Keep a university only if a fetched page of its own contains a keyword (case/diacritic-insensitive). `program` becomes the matched heading/link text; the card needs the page URL + a quote. No evidence → drop with reason `programme_not_found`.
4. Use a normal browser `User-Agent` for page fetches (many sites 403 `unifinder/1.0`); keep `Accept-Language`, add `en`. Respect the 8 s timeout (see 5).
5. Overview: prefer a sentence that mentions the programme; reject ranking/marketing lines (prompt rule + a cheap validator).

### 4. Language filter (fixes F3)
Keep a university when its language is **not stated**; show "Language not stated on the page" and rank it lower. Drop it only when a **verified** language is not one the student speaks (and `includeNeedToLearn` is off). Never infer a language from the country as a sourced fact.

### 5. Speed and streaming (fixes F5)
- Process each university independently with concurrency 3: fetch its pages in parallel (3 at a time), extract **once per university** from its programme page (no truncation), verify, then emit `result` immediately. Stop at about 8 verified results (`MAX_RESULTS` stays 12 as the hard cap).
- Timeouts: 8 s per page, ~25 s per university, 90 s per search. Skip blind guessed paths when the homepage already exposed a study/admissions link.
- Cache fetched page text in SQLite (new table via a migration, e.g. `page_cache(url, fetched_at, text)`, TTL 7 days) so repeat searches and the detail page reuse it. Migrations are in `src-tauri/src/lib.rs`; ask A or follow the pattern of versions 1–3.
- Ranking: rank incrementally or once at the end on ≤ 8 results; do not block the first card on it (emit unranked results first, then re-sort; the UI already re-sorts with a layout animation when a better-ranked result arrives).

### 6. Removal reasons
Count why each candidate was removed: `not_in_registry`, `out_of_scope`, `site_unreachable`, `programme_not_found`, `language_not_spoken`, `ai_answer_rejected`, `over_cap`. Emit them (see UI needs).

## UI needs from A (decide together, contract is frozen without agreement)
- **Additive** field on the `done` event: `reasons?: Record<string, number>` (optional, so nothing breaks). A will show a collapsed "Why N were removed" list in the Finder (strings en/es/vi on A's side, keyed by the reason codes above). Until then A shows `removed` only.
- Optional `SearchInput.degreeKeywords?: string[]` (from the saved careers) for step 3. A can fill it from `career_path.degree_keywords_json`. If not wanted, B derives keywords itself.
- New progress messages must keep stable text (A translates by pattern in `src/ui/screens/finder/progress.ts`). Message B before changing any wording, or add stable codes.
- `UniResult.program` should now be the **verified** programme text; A needs nothing else.

## Acceptance (test with both a funded OpenRouter key and OpenCode-only)
1. `Robotics` in **US**: at least 5 verified universities, each card with a programme page link + quote; no ranking-only overviews.
2. `Robotics` in **Europe**: at least 5 verified universities.
3. CMU detail page loads (or shows facts / "Not found"), never "could not load" because of JSON.
4. First card appears in about 30 s; the whole search ends in under 2 minutes.
5. Nothing fake: every shown value still has a source URL and a verified quote; unverified → `null`.
6. All existing tests pass (`bun test`), plus new ones for F2 (JSON edge cases), F3 (unstated language kept), F4 (programme evidence gate), F6 (reason counts), and a fake-HTTP test of programme discovery.

## Appendix: probe script (fetcher only, no AI, no keys)
Run from anywhere with `bun probe.ts` (adjust the repo path). It prints, per university: pages fetched, how many mention "robot", and the time.

```ts
import { RorStore } from '/ABS/PATH/UniWorld/src/core/grounding/rorStore';
import { fetchUniversityPages } from '/ABS/PATH/UniWorld/src/core/finder/webFetch';
import { readFileSync } from 'node:fs';

const ror = RorStore.fromJson(JSON.parse(readFileSync('/ABS/PATH/UniWorld/data/universities.json', 'utf8')));
const names: [string, string][] = [
  ['Delft University of Technology', 'NL'], ['Technical University of Munich', 'DE'], ['KTH Royal Institute of Technology', 'SE'],
  ['Aalto University', 'FI'], ['ETH Zurich', 'CH'], ['Politecnico di Milano', 'IT'], ['University of Edinburgh', 'GB'],
  ['Eindhoven University of Technology', 'NL'], ['Carnegie Mellon University', 'US'],
];
const http = { fetch: (u: string, i?: any) => fetch(u, i) } as any;
for (const [name, cc] of names) {
  const t0 = Date.now();
  const rec = ror.match({ name, country: cc })?.record;
  if (!rec) { console.log(name, '=> NO ROR MATCH'); continue; }
  const hits = await fetchUniversityPages(http, rec, 'Robotics', undefined, 4);
  const withRobot = hits.filter((h) => /robot/i.test(h.text));
  console.log(`${rec.name} | pages=${hits.length} | mention robot=${withRobot.length} | ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  for (const h of hits) console.log('   ', h.url, h.text.length, /robot/i.test(h.text) ? 'ROBOT' : '');
}
```

Observed output (Nov 2026): Delft 4 pages / 2 mention robot; TUM 4 / 0; KTH 4 / 1; Aalto 4 / 0; ETH 2 / 0; Polimi 4 / 0; Edinburgh 4 / 0; TU/e 4 / 1. Pages were the homepage, fees, admission letters, feedback, and "unsuccessful applicants".
