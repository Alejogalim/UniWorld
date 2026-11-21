# Person B: AI core, grounding, Finder pipeline

Read `00-how-we-work.md` and `Design.md` first (especially §5, §7.2, §7.3, §8). Branch: `feat/b-core`.
You own: `src/core/**` (incl. tests), `src/store/{counselor,search,detailCache}.ts`, `scripts/build-ror.ts`, `data/universities.json`. Do not edit `src/ui/**`, `src-tauri/**` or `src/store/{profile,tracked,settings,secrets}.ts` (use those through their exports).

## Order of work

### 1. Contract first (tonight, ~30 min, A is waiting on it)
- [ ] Write `src/core/contracts.ts` from the sketch in `00-how-we-work.md` (types + `CoreApi` + Zod schemas for every AI JSON shape). Push to `main`, tell A. After that it's frozen unless you both agree.
- [ ] Add vitest. These modules are pure TS and need no Tauri, so you can start before A's scaffold lands.

### 2. Grounding, the part that matters most (Design §7.3 step 4, §12)
- [ ] `scripts/build-ror.ts`: download ROR dump v2.16, filter `types: education`, merge domains from the Hipo list, output `data/universities.json` with `ror_id, name, aliases[], acronyms[], country_code, city, lat, lng, website, domains[]`
- [ ] `src/core/grounding/rorMatcher.ts`: match candidate → ROR record. Best signal is the source-URL domain matching an ROR domain; otherwise normalized name + country against name/aliases/acronyms. No match → dropped and counted.
- [ ] **Unit-test the matcher on ~20 known cases**, including translated names (e.g. "Universidad de Barcelona", "Technische Universität München").
- [ ] `src/core/grounding/citationValidator.ts`: each fact's `sourceUrl` must be one of the URLs the search returned, and its `quote` must appear in that URL's returned text after normalizing whitespace/case/punctuation. Otherwise the fact becomes `null`. **Never relax this check.**
- [ ] Tests for the validator: quote present, quote absent, URL not returned, normalization variants.
- [ ] Zod schemas for every AI response, with one retry on invalid JSON.

### 3. AI client
- [ ] `src/core/ai/`: OpenRouter client (default model `deepseek/deepseek-v4.1-flash`, editable via settings; send `provider: { zdr: true }`; web search through `openrouter:web_search` server tool or the `web` plugin, your call). It must return the **page text/excerpts**, not just URLs, because the quote check needs them.
- [ ] OpenCode Go client (optional, Counselor only, no web search): `User-Agent: unifinder/1.0` and a stable `x-opencode-session` header per conversation
- [ ] Read keys through A's `store/secrets.ts` and network through `tauri-plugin-http`
- [ ] `testConnection(provider)`
- [ ] If only an OpenCode key exists, Finder returns the error "University search needs an OpenRouter key (for verified web search)."

### 4. Counselor (§7.2)
- [ ] System prompt: address the student by name, reply in `respond_in: <primary_lang>`, ask **one question at a time**, reflect back, point out tensions, **never prescribe a career**, short replies
- [ ] `counselor.start/send` with streaming (`onToken`), persisting sessions and messages via `store/counselor.ts`
- [ ] `counselor.careers`: structured JSON, 3–5 careers (title, summary, whyYou grounded in the student's answers, fit breakdown weighted by the slider values, degree keywords). Zod-checked, one retry.

### 5. Finder pipeline (§7.3)
1. [ ] Plan 2–3 queries (careers, scope, filters, student's languages, program)
2. [ ] Web search → candidate pages + text + citation URLs
3. [ ] Extract JSON candidates; the prompt must say "use only the provided text; null if absent; every fact cites a given URL with an exact quote"
4. [ ] Verify with the grounding modules from step 2; emit `FinderEvent`s: progress, results as they verify, final `verified`/`removed` counts (max 12 results)
5. [ ] Rank with the **verified facts only** (never the raw search text): career fit, admission fit (Reach/Match/Safety/Unknown), language fit (B2+ or native = speaks), cost fit, one-line `whyFits` naming real profile facts; sort by overall fit
6. [ ] "Couldn't verify enough results, try a narrower scope" when too few survive. Never pad with guesses.
7. [ ] `finder.detail`: second search aimed at the uni's own domain; fields per `UniDetail`; same quote check; 30-day cache in `detailCache.ts`; `refresh` option; also cache `uni_search` results so retakes are instant
8. [ ] Honor the filters: tuition-free only, language I speak (default on), include need-to-learn (default off, with the "You'd need to learn X" note)

### 6. Wire-up and hardening (Sun 12:00–18:00)
- [ ] Export the real `CoreApi` implementation; provide a tiny CLI/script (`bun run scripts/search.ts "Computer Science" DE`) so you can run Finder without the UI
- [ ] Run real searches across 3–4 scopes and read the output for fake universities or unsupported facts
- [ ] Tell A when the real `CoreApi` is ready (M3) so they delete the stub

## Minimum tests (Design §13)
ROR matcher, citation validator, Zod schemas.

## Requests (add things you need from A here)
- 

## Done =
Searching a career in a scope returns only ROR-matched universities, every shown fact has a source link and a verified quote, and missing facts are `null`. Counselor never prescribes and replies in the student's language.
