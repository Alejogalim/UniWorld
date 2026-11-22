# Graph Report - UniWorld  (2026-11-22)

## Corpus Check
- 268 files · ~446,396 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 13 file(s) not represented in the graph (top: (none) 3, .woff2 3, .css 2)

## Summary
- 2140 nodes · 5766 edges · 107 communities (99 shown, 8 thin omitted)
- Extraction: 92% EXTRACTED · 8% INFERRED · 0% AMBIGUOUS · INFERRED: 476 edges (avg confidence: 0.93)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `54da50ee`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- Onboarding.tsx
- SqlCounselorStore
- build-ror.ts
- TrackedUniEditor.tsx
- HttpResponseLike
- ports.ts
- Provider
- Button
- prompts.ts
- UniDetail.tsx
- rorStore.ts
- ChatMessage
- Continent
- core/index.ts
- Components
- citationValidator.ts
- bundle
- package.json
- dependencies
- config.ts
- useCounselor.ts
- schemas.ts
- StatusProgress.tsx
- verify.ts
- components.json
- i18n/index.ts
- Minor
- Finder.tsx
- Minor
- scoring.ts
- components/index.ts
- compilerOptions
- suggest.ts
- webFetch.ts
- with
- getDb
- react
- InMemoryCounselorStore
- theme.ts
- callJson
- compilerOptions
- lib.rs
- scripts
- AppShell.tsx
- 02 — Foundation, push 2: plugins, DB, keychain, shell, i18n (rest of M1)
- prompts.ts
- ref_bun_test
- CoreApi
- UniWorld
- counselorSystemPrompt
- eval-counselor.ts
- Order of work
- 34 — Finder: compact Countries tab + globe under the rail
- finder/index.ts
- How we work (read first, both of us)
- PageCache
- tauri.ts
- vite.config.ts
- Steps
- Steps
- AiClient
- compilerOptions
- main.tsx
- 01 — Foundation, push 1: bare scaffold (unblocks B)
- A — build conventions (every builder reads this first)
- contracts.ts
- stub.ts
- Settings (`src/ui/screens/Settings.tsx` + `src/ui/screens/settings/`)
- ai/types.ts
- default.json
- 09 — README, license, attributions, Windows build workflow (A plan §6)
- driver.ts
- uniworld
- Fixes — Part B (Finder + AI JSON), written by A for B
- checks.ts
- 35 — My universities: status track motion ("light travels along the track")
- geo.ts
- 37 — University detail: centred column, calm header, tidy facts
- Globe.tsx
- verify.test.ts
- 26 — Light mode: soft paper, an ember glow, ember sparks
- 20 — Starfield optimization: handoff plan (read this first in a fresh session)
- Finder: supported countries (Part B)
- startSky
- Starfield.tsx
- openrouter.ts
- 14 — New palette: "Ember" (from the owner's reference image)
- 15 — Review of plan 14 (Ember palette), uncommitted working tree on feat/a-ui
- 25 — Friendlier counselor intake: better questions, hints, progress
- transport.ts
- Findings
- Steps
- 33 — Finder glass dock: smaller, translucent, responsive inside
- Steps
- 19 — Starfield that does not lag
- 21 — Still sky (replaces the drifting starfield)
- OpenRouterClient
- 18 — Performance pass, more stars, outer-only glow
- 23 — Collapsible rail like Gemini's, and a more visible logo
- 24 — Rail like Gemini's: logo is the opener; rail is its own column; no title on the counselor
- transcript.ts
- class-variance-authority
- providerChoice.ts
- @tauri-apps/plugin-sql

## God Nodes (most connected - your core abstractions)
1. `Provider` - 53 edges
2. `Button()` - 50 edges
3. `react` - 44 edges
4. `react-i18next` - 41 edges
5. `ErrorNote()` - 41 edges
6. `Profile` - 39 edges
7. `normalizeText()` - 38 edges
8. `RorStore` - 32 edges
9. `loadDetail()` - 31 edges
10. `SearchInput` - 30 edges

## Surprising Connections (you probably didn't know these)
- `Builder notes` --references--> `counselorProvider()`  [INFERRED]
  .plans/31-settings-redesign.md → src/core/ai/index.ts
- `[x] 9. i18n — replace the three `settings.json` files completely` --references--> `counselorProvider()`  [INFERRED]
  .plans/31-settings-redesign.md → src/core/ai/index.ts
- `2. Make JSON extraction robust (OpenCode and OpenRouter)` --references--> `callJson()`  [INFERRED]
  .plans/Fixes-PartB.md → src/core/ai/json.ts
- `3. Programme discovery (fixes F1, F4)` --references--> `SearchInput`  [INFERRED]
  .plans/Fixes-PartB.md → src/core/contracts.ts
- `Checkpoints (Swedish time)` --references--> `CoreApi`  [INFERRED]
  .plans/00-how-we-work.md → src/core/contracts.ts

## Import Cycles
- None detected.

## Communities (107 total, 8 thin omitted)

### Community 0 - "Onboarding.tsx"
Cohesion: 0.06
Nodes (72): zustand@^5.1.0, 04 — Onboarding (Design §7.1), Builder notes, Slice checks, 38 — Onboarding: no box, one column, quiet progress, Builder notes, Builder rules, Steps (+64 more)

### Community 1 - "SqlCounselorStore"
Cohesion: 0.06
Nodes (18): 12 — Counselor provider switch (UI-only fix), Deviations, Problem, Results, Binding, BunSqlClient, SqlClient, StoredMessage (+10 more)

### Community 2 - "build-ror.ts"
Cohesion: 0.05
Nodes (42): continentMap, CONTINENTS, Feature, features, Geometry, Position, root, sorted (+34 more)

### Community 3 - "TrackedUniEditor.tsx"
Cohesion: 0.09
Nodes (42): Shortlist (Uni Manager), Steps, Builder notes, 1. Layout: three groups, no table, 27 — My universities: calm list grouped by what's next, editing in a side panel, 2. One row = three zones (CSS grid `grid-cols-[minmax(0,1fr)_10rem_9rem]`, gap-6, py-4, items-start; whole row is a `<button>` that opens the panel, full width, text-left, `hover:bg-shoal/50 rounded-control -mx-3 px-3`, focus-visible outline signal; `aria-label` "Edit {{name}}" — new key `row.edit`), 3. Side panel (editing), 4. i18n (+34 more)

### Community 4 - "HttpResponseLike"
Cohesion: 0.16
Nodes (8): FakeHttp, candidateJson(), response(), FakeHttp, response(), page(), HttpRequestInit, HttpResponseLike

### Community 5 - "ports.ts"
Cohesion: 0.12
Nodes (19): FileDetailCache, FileSearchCache, searchKey(), writeJson(), InMemoryDetailCache, InMemorySearchCache, searchKey(), SearchInput (+11 more)

### Community 6 - "Provider"
Cohesion: 0.07
Nodes (41): main(), parseArgs(), parseWeights(), main(), runPersona(), CONTINENTS, createPrinter(), defaultProfile() (+33 more)

### Community 7 - "Button"
Cohesion: 0.10
Nodes (38): Steps, Decisions, Decisions, react-i18next, react-router, BoundaryProps, BoundaryState, ErrorFallback() (+30 more)

### Community 8 - "prompts.ts"
Cohesion: 0.18
Nodes (21): nextTokenBudget(), MAX_SEARCH_QUERIES, QUERY_PLAN_MAX_TOKENS, fallbackQueries(), levelLabel(), planQueries(), scopePhrase(), searchableLanguages() (+13 more)

### Community 9 - "UniDetail.tsx"
Cohesion: 0.09
Nodes (42): Finder screen (`src/ui/screens/Finder.tsx` + `src/ui/screens/finder/`), 10 - Review of Person A's UI (184e5ea..HEAD, branch feat/a-ui), 1. Finder: a search cannot be cancelled, and late events corrupt the next state, 3. Result rows show values with no source marker or link, 4. "Clear all my data" is not atomic and can leave the app in a split state, 5. No CSP, unrestricted keychain command, and a very wide HTTP scope, Checked and found fine (no action), Important (+34 more)

### Community 10 - "rorStore.ts"
Cohesion: 0.13
Nodes (24): mergeHipoDomains(), ROR_FUZZY_MARGIN, ROR_FUZZY_THRESHOLD, countryMatches(), domainLabel(), looksLikeMain(), looksLikeUnit(), MAIN_MARKERS (+16 more)

### Community 11 - "ChatMessage"
Cohesion: 0.33
Nodes (5): OpenCodeClient, ProviderError, readError(), ChatMessage, ChatOptions

### Community 12 - "Continent"
Cohesion: 0.20
Nodes (10): 06 — Globe + Finder search (Design §7.3), Builder notes, Data (A owns `data/countries.geojson`, `data/country-continent.json`), Globe (`src/ui/globe/`), Slice checks, Args, Continent, GeoView (+2 more)

### Community 13 - "core/index.ts"
Cohesion: 0.15
Nodes (24): 05 — Counselor (Design §7.2), Builder notes, Deviations, How the core behaves (important), Intake design (UI-side, fixed 6 questions), Slice checks, counselorProvider(), createAiClient() (+16 more)

### Community 14 - "Components"
Cohesion: 0.06
Nodes (35): Buttons, Chips and badges, Colors, Components, Contrast, Design System: UniWorld, Do, Do's and Don'ts (+27 more)

### Community 15 - "citationValidator.ts"
Cohesion: 0.10
Nodes (28): 2a. Add after the `import { languageName, languagesInText } from './languages';` line, 2b. In `CitationIndex.fromHits`, 2c. In `validateFact`, 2d. `src/core/grounding/citationValidator.test.ts`, Step 2 — `src/core/grounding/citationValidator.ts`, CitationIndex, dateSupport(), examsSupport() (+20 more)

### Community 16 - "bundle"
Cohesion: 0.07
Nodes (26): app, security, windows, build, beforeBuildCommand, beforeDevCommand, devUrl, frontendDist (+18 more)

### Community 17 - "package.json"
Cohesion: 0.11
Nodes (25): devDependencies, bun-types@latest, countries-list@^3.4.1, fflate@^0.8.2, shadcn@^4.23.0, tailwindcss@^4.3.5, @tauri-apps/cli@^2, @types/node@^26.6.6 (+17 more)

### Community 18 - "dependencies"
Cohesion: 0.09
Nodes (23): dependencies, cn@^0.5.2, country-flag-icons@^1.6.20, @fontsource-variable/inter@^5.3.0, framer-motion@^14.14.0, globe.gl@2.46.2, i18next@^27.2.3, lucide-react@^1.77.0 (+15 more)

### Community 19 - "config.ts"
Cohesion: 0.06
Nodes (45): CAREER_DIMENSIONS, CAREER_IDEAS_MIN_STUDENT_MESSAGES, DETAIL_CACHE_TTL_MS, DETAIL_ENRICH_PAGES, DETAIL_ENRICH_TIMEOUT_MS, DETAIL_MAX_CHARS_PER_HIT, DETAIL_MAX_HITS, DETAIL_MAX_TOKENS (+37 more)

### Community 20 - "useCounselor.ts"
Cohesion: 0.14
Nodes (25): useCore(), CounselorErrorNoteProps, ChatMessage, clearLatestBatch(), CounselorError, CounselorStatus, countStudentMessages(), DEFAULT_WEIGHTS (+17 more)

### Community 21 - "schemas.ts"
Cohesion: 0.08
Nodes (23): admissionFitSchema, AiStringArrayFact, aiStringArrayFactSchema, AiStringFact, aiStringFactSchema, candidateSchema, careerIdeaSchema, careerIdeasSchema (+15 more)

### Community 22 - "StatusProgress.tsx"
Cohesion: 0.06
Nodes (56): 36 — My universities: status track, premium pass (legible, one accent), Acceptance (orchestrator checks visually, light and dark), Builder notes, Builder rules, Contrast (WCAG 2.x, computed; card = `--panel`, dark card top = `#151517`), Decisions and their reasons, Step 1 — `src/ui/screens/myUnis/trackMotion.ts` (three exact edits), Step 2 — `src/ui/screens/myUnis/trackMotion.test.ts` (four exact edits) (+48 more)

### Community 23 - "verify.ts"
Cohesion: 0.19
Nodes (16): For A (UI), RemovalReason, looksNonBachelor(), applyFilters(), emptyFact(), inScope(), isRankingOverview(), mergeResults() (+8 more)

### Community 24 - "components.json"
Cohesion: 0.09
Nodes (21): aliases, components, hooks, lib, ui, utils, iconLibrary, menuAccent (+13 more)

### Community 26 - "Minor"
Cohesion: 0.12
Nodes (13): Builder notes, 10. Languages are shown as ISO codes on the detail page and in the tracker, 11. Onboarding draft and typed keys linger in memory after leaving the screen, 12. Countries can only be selected with the mouse on the globe, 13. `profile.save` is not transactional, 14. Opening a tracked university after editing its program name silently starts a live search, 6. Opener accepts any scheme the plugin allows, with URLs that come from AI-extracted facts, 7. Career sent from the Counselor is re-added every time `CareerPicker` mounts (+5 more)

### Community 27 - "Finder.tsx"
Cohesion: 0.08
Nodes (34): Scope, Chip(), ChipProps, EmptyState(), EmptyStateProps, CareerPicker(), CountryPicker(), CountryPickerProps (+26 more)

### Community 28 - "Minor"
Cohesion: 0.04
Nodes (43): 16 — "Ember glow" visual pass: Inter, soft surfaces, gradients, drifting stars, Contrast & slop pre-flight (measure and report), Design decisions (do not re-debate; implement), Motion, Pass 1 — system, Pass 2 — starfield and screens, Shape lock (state this rule in DESIGN.md, then never violate it), Starfield (new, all screens) (+35 more)

### Community 29 - "scoring.ts"
Cohesion: 0.26
Nodes (16): AdmissionFit, applyAiItem(), deterministic(), deterministicResults(), admissionScore(), careerFit(), CLAIM_STOPWORDS, costFit() (+8 more)

### Community 30 - "components/index.ts"
Cohesion: 0.13
Nodes (24): Primitives (`src/ui/components/`), Steps, 07 — University detail page, "Add to my list", Uni Manager (Design §7.3 detail, §7.4), DB, Detail page (`src/ui/screens/UniDetail.tsx`, route `/finder/uni/:rorId`, replacing the placeholder), Slice checks, Uni Manager (`src/ui/screens/MyUnis.tsx` + `src/ui/screens/myUnis/`), Settings (`src/ui/screens/Settings.tsx` + `src/ui/screens/settings/`) (+16 more)

### Community 31 - "compilerOptions"
Cohesion: 0.10
Nodes (20): compilerOptions, allowImportingTsExtensions, isolatedModules, jsx, lib, module, moduleResolution, noEmit (+12 more)

### Community 32 - "suggest.ts"
Cohesion: 0.10
Nodes (28): CallJsonOptions, KEYWORD_MAX_TOKENS, RemovalReasons, around(), containsTerm(), degreeKeywordsSchema, escapeRegExp(), expandDegreeKeywords() (+20 more)

### Community 33 - "webFetch.ts"
Cohesion: 0.15
Nodes (31): 3b. Append at the end of the file, Decisions, allowedHostSet(), anchors(), COUNTRY_HINTS, countryHints(), decodeEntities(), DETAIL_KEYWORDS (+23 more)

### Community 34 - "with"
Cohesion: 0.11
Nodes (17): jobs, windows, name, on, push, workflow_dispatch, tags, name (+9 more)

### Community 35 - "getDb"
Cohesion: 0.39
Nodes (7): UI (A's area), getDb(), deleteSetting(), getSetting(), setSetting(), dropUnsentDuplicate(), syncSessionProvider()

### Community 36 - "react"
Cohesion: 0.13
Nodes (33): [x] 7. `AiSection.tsx` — restructure markup only, lucide-react, react, changeUiLanguage(), UiLang, ErrorNote(), ErrorNoteProps, nextEnabledIndex() (+25 more)

### Community 37 - "InMemoryCounselorStore"
Cohesion: 0.09
Nodes (11): 2. Counselor "Try again" duplicates the student's message in the database, Changes (UI layer only; `src/core/**` and B's stores untouched), 4. Counselor UI (§7.2), Args, InMemoryCounselorStore, CareerPath, CounselorNotes, CounselorWeights (+3 more)

### Community 38 - "theme.ts"
Cohesion: 0.20
Nodes (14): apply(), cacheMode(), initTheme(), isMode(), readCachedMode(), resolve(), ResolvedTheme, systemQuery (+6 more)

### Community 39 - "callJson"
Cohesion: 0.15
Nodes (16): zod@^4.6.7, 1. Make AI failures visible (small, do first), F2. JSON failures are lost, and the search path swallows them, zod, JudgeInput, judgePrompt(), judgeReply(), judgeSchema (+8 more)

### Community 40 - "compilerOptions"
Cohesion: 0.14
Nodes (13): ./tsconfig.json, compilerOptions, composite, lib, noUnusedLocals, noUnusedParameters, paths, target (+5 more)

### Community 41 - "lib.rs"
Cohesion: 0.24
Nodes (7): entry(), is_allowed_account(), keychain_roundtrip(), KEYCHAIN_SERVICE, secret_delete(), secret_get(), secret_set()

### Community 42 - "scripts"
Cohesion: 0.14
Nodes (14): scripts, build, build:globe, build:ror, check:i18n, counselor, dev, eval:counselor (+6 more)

### Community 43 - "AppShell.tsx"
Cohesion: 0.17
Nodes (8): A. Rail (src/ui/layout/AppShell.tsx, src/index.css if needed), Target behaviour (reference: Gemini's sidebar), framer-motion, ErrorBoundary, AppShell(), NAV, LanguageSwitcher(), Logo()

### Community 44 - "02 — Foundation, push 2: plugins, DB, keychain, shell, i18n (rest of M1)"
Cohesion: 0.17
Nodes (11): 02 — Foundation, push 2: plugins, DB, keychain, shell, i18n (rest of M1), App shell (`src/app/`, `src/ui/`), Builder notes, Database (`src/db/`), Done =, Hard rules for the builder, i18n (`src/i18n/`), Rust side (`src-tauri/`) (+3 more)

### Community 45 - "prompts.ts"
Cohesion: 0.11
Nodes (26): Files, Step 4 — `src/core/ai/prompts.ts` (in `detailPrompt`, system message), CAREER_BUTTON, careersPrompt(), detailPrompt(), extractionPrompt(), NOTE_LABELS, notesPrompt() (+18 more)

### Community 46 - "ref_bun_test"
Cohesion: 0.19
Nodes (14): afterReply(), FULL_TAGS, readReplyTag(), stripReplyTags(), visibleReply(), decodeIntake(), IntakeFrame, IntakeOutcome (+6 more)

### Community 47 - "CoreApi"
Cohesion: 0.15
Nodes (12): 1. Contract first (tonight, ~30 min, A is waiting on it), 2. Grounding, the part that matters most (Design §7.3 step 4, §12), 3. AI client, 4. Counselor (§7.2), 6. Wire-up and hardening (Sun 12:00–18:00), Done =, Implementation status (this session), Minimum tests (Design §13) (+4 more)

### Community 48 - "UniWorld"
Cohesion: 0.18
Nodes (10): AI tools disclosure, Data attribution, Development, Install, Languages, License, Project layout, Real data only (+2 more)

### Community 49 - "counselorSystemPrompt"
Cohesion: 0.14
Nodes (18): 28 — Counselor: new system prompt + offline-tested eval harness, Builder notes, Files, Goal, Rules (read before anything else), Steps, Verify (paste short results under Builder notes), 29 — Counselor: adaptive intake (AI asks in its own words, one follow-up per topic) + new topics (+10 more)

### Community 50 - "eval-counselor.ts"
Cohesion: 0.18
Nodes (17): CheckResult, EvalLang, Args, message(), parseArgs(), initialDriverState, intakeQuestion(), JudgeScore (+9 more)

### Community 51 - "Order of work"
Cohesion: 0.20
Nodes (9): 1. Foundation (tonight, do first, B is waiting on the scaffold), 2. Onboarding (§7.1), 5. Uni Manager (§7.4) + Settings (§7.5), 6. Polish and submission (Sun 16:00–20:30), Done =, Order of work, Person A: App shell, UI, globe, local data, Requests (add things you need from B here) (+1 more)

### Community 52 - "34 — Finder: compact Countries tab + globe under the rail"
Cohesion: 0.11
Nodes (18): 34 — Finder: compact Countries tab + globe under the rail, A1. i18n (`src/i18n/locales/*/finder.json`), A2. `src/index.css` — the chip-row helper, A3. `src/ui/screens/finder/CountryPicker.tsx`, A4. `src/ui/screens/finder/ScopePicker.tsx`, A5. `src/ui/screens/Finder.tsx` — no change for Part A, B1. `src/ui/globe/Globe.tsx`, B2. `src/ui/screens/Finder.tsx` (+10 more)

### Community 53 - "finder/index.ts"
Cohesion: 0.11
Nodes (30): 13 — Finder search with OpenCode Go (no web search), Builder notes, Design (keep it grounded — Design §3), Problem, Tests (bun test, same style as pipeline.test.ts; no network), Verify, Requests (add things you need from A here), What A already changed in B's folders (please review) (+22 more)

### Community 54 - "How we work (read first, both of us)"
Cohesion: 0.22
Nodes (8): Checkpoints (Swedish time), How we work (read first, both of us), Merge protocol, Ownership, Rules that prevent merge pain, Step 0: Foundation (the only coupled part, ~1 hour, tonight), The contract (`src/core/contracts.ts`), Working with AI agents

### Community 55 - "PageCache"
Cohesion: 0.15
Nodes (8): FilePageCache, InMemoryPageCache, PageCandidatesOptions, EnrichHitsOptions, CachedPage, PageCache, PageRow, SqlPageCache

### Community 56 - "tauri.ts"
Cohesion: 0.16
Nodes (11): createTauriSqlClient(), TauriHttpClient, tauriProfile, tauriSecrets, TauriSettingsStore, TauriSqlClient, createAppCore(), getReady() (+3 more)

### Community 57 - "vite.config.ts"
Cohesion: 0.25
Nodes (6): @tailwindcss/vite@^4.3.5, vite@^8.0.16, @vitejs/plugin-react@^6.0.2, @tailwindcss/vite, vite, @vitejs/plugin-react

### Community 58 - "Steps"
Cohesion: 0.25
Nodes (7): 03 — Design system, light/dark theme, shell, primitives, Builder notes, Placeholder screens, Shell, Slice checks (in addition to the conventions' Verify), Steps, Tokens + theme

### Community 59 - "Steps"
Cohesion: 0.11
Nodes (17): 31 — Settings redesign: one calm column of grouped lists, Acceptance (reviewer checks by reading the diff), Builder notes, Files, Goal, Rules (read before anything else), Steps, [x] 10. `DESIGN.md` (owner override; only these edits) (+9 more)

### Community 60 - "AiClient"
Cohesion: 0.11
Nodes (15): 39 — Detail coverage: better sources, tolerant quote matching, short cache for sparse results, 3a. Import line, 3c. `src/core/finder/webFetch.test.ts`, 6a. New file `src/core/finder/detailHelpers.test.ts`, 6b. `src/core/finder/detailFallback.test.ts`, Builder notes, Builder rules, Done when (+7 more)

### Community 61 - "compilerOptions"
Cohesion: 0.25
Nodes (7): compilerOptions, allowSyntheticDefaultImports, composite, module, moduleResolution, skipLibCheck, include

### Community 62 - "main.tsx"
Cohesion: 0.33
Nodes (4): react-dom@^19.1.0, react-dom, App(), router

### Community 63 - "01 — Foundation, push 1: bare scaffold (unblocks B)"
Cohesion: 0.29
Nodes (6): 01 — Foundation, push 1: bare scaffold (unblocks B), Builder notes, Done =, Hard rules for the builder, Steps, Verify (run all, paste results in Builder notes)

### Community 64 - "A — build conventions (every builder reads this first)"
Cohesion: 0.29
Nodes (6): A — build conventions (every builder reads this first), Hard rules, How the UI reaches data, i18n, Verify (every slice, plus the slice's own checks), Visual system (DESIGN.md is binding)

### Community 65 - "contracts.ts"
Cohesion: 0.07
Nodes (20): 3. Globe + Finder UI (§7.3), 5. Finder pipeline (§7.3), isChatModel(), ModelListOptions, modelsFrom(), RawModel, OPENCODE_MODELS_URL, OPENROUTER_BASE_URL (+12 more)

### Community 66 - "stub.ts"
Cohesion: 0.38
Nodes (6): createStubCoreApi(), fact(), stubCareers, stubCoreApi, stubDetail, stubUni()

### Community 67 - "Settings (`src/ui/screens/Settings.tsx` + `src/ui/screens/settings/`)"
Cohesion: 0.40
Nodes (4): 08 — Settings (Design §7.5) + polish backlog, Builder notes, Polish backlog (from the orchestrator's visual review), Slice checks

### Community 68 - "ai/types.ts"
Cohesion: 0.22
Nodes (11): OpenCodeOptions, citationsFrom(), extractContent(), withTimeoutSignal(), AiClientConfig, ChatRole, SearchHit, SearchOptions (+3 more)

### Community 69 - "default.json"
Cohesion: 0.33
Nodes (5): description, identifier, permissions, $schema, windows

### Community 70 - "09 — README, license, attributions, Windows build workflow (A plan §6)"
Cohesion: 0.40
Nodes (4): 09 — README, license, attributions, Windows build workflow (A plan §6), Builder notes, Slice checks, Steps

### Community 71 - "driver.ts"
Cohesion: 0.16
Nodes (12): Steps, CheckId, CheckInput, DriverReply, DriverState, DriverTurn, LOCALES, nextTurn() (+4 more)

### Community 76 - "Fixes — Part B (Finder + AI JSON), written by A for B"
Cohesion: 0.12
Nodes (15): 2. Make JSON extraction robust (OpenCode and OpenRouter), 3. Programme discovery (fixes F1, F4), 4. Language filter (fixes F3), 6. Removal reasons, Acceptance (test with both a funded OpenRouter key and OpenCode-only), Appendix: probe script (fetcher only, no AI, no keys), F1. No step finds the programme (evidence from a probe), F3. Language filter drops universities that don't state the language (+7 more)

### Community 77 - "checks.ts"
Cohesion: 0.28
Nodes (14): countQuestions(), detectLanguage(), EN_WORDS, ES_WORDS, escapeRegExp(), findPrescription(), isDoubleBarrelled(), mentionsName() (+6 more)

### Community 78 - "35 — My universities: status track motion ("light travels along the track")"
Cohesion: 0.13
Nodes (14): 35 — My universities: status track motion ("light travels along the track"), Acceptance (orchestrator checks visually, light and dark), Builder notes, Builder rules, Goal (one slice, demoable), Step 1 — `src/ui/screens/myUnis/trackMotion.ts` (new file), Step 2 — `src/ui/screens/myUnis/trackMotion.test.ts` (new file), Step 3 — `src/ui/screens/myUnis/useLiveWhileVisible.ts` (new file) (+6 more)

### Community 79 - "geo.ts"
Cohesion: 0.19
Nodes (10): FALLBACK_COUNTRY_VIEWS, clamp(), CONTINENT_VIEWS, continentByCode, CONTINENTS, CountryFeature, countryView(), eachPosition() (+2 more)

### Community 80 - "37 — University detail: centred column, calm header, tidy facts"
Cohesion: 0.14
Nodes (13): 37 — University detail: centred column, calm header, tidy facts, 4a — imports, 4b — Back button aligned to the column edge, 4c — no-program page wrapper, 4e — full-page wrapper, Builder notes, Builder rules, Step 1 — `src/ui/data/languages.ts` (append at end of file) (+5 more)

### Community 81 - "Globe.tsx"
Cohesion: 0.29
Nodes (12): 7. [minor] `cssToHex` fallback is dead weight and wrong if ever reached, Step 6 — small component touches, continentOf(), loadCountries(), viewForCountry(), cssToHex(), escapeHtml(), GlobeView() (+4 more)

### Community 82 - "verify.test.ts"
Cohesion: 0.19
Nodes (9): candidate(), index, input, profile, ror, run(), FIXTURE_RECORDS, nameOf() (+1 more)

### Community 83 - "26 — Light mode: soft paper, an ember glow, ember sparks"
Cohesion: 0.17
Nodes (11): 26 — Light mode: soft paper, an ember glow, ember sparks, Acceptance (for the reviewer, not the builder), Builder notes, Rules for the builder, Step 1 — `src/index.css`: light tokens (`:root` block, lines ~76-138), Step 2 — `src/index.css`: dark tokens (`.dark` block, lines ~141-168), Step 3 — `src/index.css`: components, Step 4 — `src/index.css`: twinkles and shooting star (+3 more)

### Community 84 - "20 — Starfield optimization: handoff plan (read this first in a fresh session)"
Cohesion: 0.18
Nodes (10): 20 — Starfield optimization: handoff plan (read this first in a fresh session), Acceptance for the optimization, Builder notes, Current implementation (commit `ab5e83f`), How to measure frame rate (reproducible method), Measurements (real app, 1920×1080, Linux WebKitGTK with `WEBKIT_DISABLE_DMABUF_RENDERER=1` = software compositing and software WebGL), Open questions for the owner (ask before building), Plan (in order of payoff) (+2 more)

### Community 85 - "Finder: supported countries (Part B)"
Cohesion: 0.20
Nodes (9): Example verified rows, Finder: supported countries (Part B), How it works (why these countries pass), How to reproduce, Known weak spots, Latest spot checks (one run each, same code), Local hints per country, Perf / cache (+1 more)

### Community 86 - "startSky"
Cohesion: 0.38
Nodes (10): 8. Resize regenerates the whole field (stars pop) and DPR change is ignored, startSky(), fireShoot(), isPaused(), onBlur(), onFocus(), onResize(), redraw() (+2 more)

### Community 87 - "Starfield.tsx"
Cohesion: 0.27
Nodes (9): Step 5 — `src/ui/layout/Starfield.tsx`, layerFor(), LAYERS, LayerSpec, makeTwinkles(), Motion, paint(), Starfield() (+1 more)

### Community 88 - "openrouter.ts"
Cohesion: 0.20
Nodes (8): Annotation, markdownLinks(), OpenRouterOptions, UrlCitation, DEFAULT_MODEL, SEARCH_MAX_CHARACTERS, SEARCH_MAX_RESULTS_PER_QUERY, canonicalJson()

### Community 89 - "14 — New palette: "Ember" (from the owner's reference image)"
Cohesion: 0.22
Nodes (8): 14 — New palette: "Ember" (from the owner's reference image), Builder notes, Contrast (measured by /tmp/ember/contrast.mjs, WCAG 2.x), The reference (owner's image: a clock-style card, dark and light), Tokens (replace the current palette in `src/index.css`; keep the same token NAMES so components keep working), Verify, Verify, Where the ember is allowed (DESIGN.md rule: spend it in a few places)

### Community 90 - "15 — Review of plan 14 (Ember palette), uncommitted working tree on feat/a-ui"
Cohesion: 0.22
Nodes (8): 15 — Review of plan 14 (Ember palette), uncommitted working tree on feat/a-ui, Ember usage rule (item 3), Fixes applied, Independent contrast measurements, Leftover grep (item 2), Suggested order for the fixer, Summary, Verification commands

### Community 91 - "25 — Friendlier counselor intake: better questions, hints, progress"
Cohesion: 0.22
Nodes (8): 1. Rewrite the six questions (all 3 languages; keep the `{{name}}` in q1; keys unchanged `intake.q1..q6`), 25 — Friendlier counselor intake: better questions, hints, progress, 2. Hints (UI only, never sent to the AI), 2b. Small helpers, 3. Progress, 4. Copy polish, Verify (report output), Why

### Community 92 - "transport.ts"
Cohesion: 0.28
Nodes (5): consumeSse(), ExtractedContent, looksTruncated(), SseChunk, sse

### Community 93 - "Findings"
Cohesion: 0.25
Nodes (8): 1. [important] Light `--signal` as small text on the page background is 4.46:1, 3. [minor] `--shoal` is almost indistinguishable from panel and (light) from background, 4. [minor] Chip selected tick is under 3:1 in dark, 5. [minor] Welcome glow: owed visual check, rectangular footprint, text over amber, 6. [minor] Light-mode ember gradient on the ProgressLine dot, 8. [minor] Globe: selected glow and light atmosphere not verified, 9. [minor] DESIGN.md small inconsistencies, Findings

### Community 94 - "Steps"
Cohesion: 0.25
Nodes (7): 30 — Counselor: running "what I've learned" notes, Builder notes, Data format, Goal, Rules (read before anything else), Steps, Verify (paste short results under Builder notes)

### Community 95 - "33 — Finder glass dock: smaller, translucent, responsive inside"
Cohesion: 0.25
Nodes (7): 33 — Finder glass dock: smaller, translucent, responsive inside, Builder notes, Builder rules, Do NOT (plan 32 was rejected for these), Goal (one slice, demoable), Sizes (decided), Verify

### Community 96 - "Steps"
Cohesion: 0.25
Nodes (8): 1. `src/index.css` — the glass surface, 2. `src/ui/screens/Finder.tsx`, 3. `src/ui/screens/finder/ScopePicker.tsx`, 4. `src/ui/screens/finder/CountryPicker.tsx`, 5. `src/ui/screens/finder/ResultRow.tsx` — viewport breakpoints to container breakpoints, 6. Detail view, 7. `DESIGN.md` — Finder text, Steps

### Community 97 - "19 — Starfield that does not lag"
Cohesion: 0.33
Nodes (5): 19 — Starfield that does not lag, Acceptance (builder), Builder notes, Measured evidence (real app, frame-rate probe, software WebKitGTK, 1920×1080), New design: stars that only move when the user is idle, and almost never repaint

### Community 98 - "21 — Still sky (replaces the drifting starfield)"
Cohesion: 0.33
Nodes (5): 21 — Still sky (replaces the drifting starfield), Acceptance, Build, Rules, Verify (run all, report output)

### Community 100 - "18 — Performance pass, more stars, outer-only glow"
Cohesion: 0.40
Nodes (4): 18 — Performance pass, more stars, outer-only glow, Acceptance (builder checks), Builder notes, Steps

### Community 101 - "23 — Collapsible rail like Gemini's, and a more visible logo"
Cohesion: 0.40
Nodes (4): 23 — Collapsible rail like Gemini's, and a more visible logo, B. Logo (src/assets/logo, src/ui/layout/Logo.tsx), Problems, Verify (report output)

### Community 102 - "24 — Rail like Gemini's: logo is the opener; rail is its own column; no title on the counselor"
Cohesion: 0.40
Nodes (4): 24 — Rail like Gemini's: logo is the opener; rail is its own column; no title on the counselor, Docs, Structure change (drop the shared grid with the title), Verify (report output)

### Community 103 - "transcript.ts"
Cohesion: 0.70
Nodes (3): buildTranscript(), readStudentMessage(), StudentTurn

### Community 104 - "class-variance-authority"
Cohesion: 0.33
Nodes (4): class-variance-authority@^0.7.1, tw-animate-css@^1.4.0, class-variance-authority, tw-animate-css

## Knowledge Gaps
- **2 isolated node(s):** `./tsconfig.json`, `uniworld`
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 762 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **8 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Panel()` connect `Button` to `Onboarding.tsx`, `A — build conventions (every builder reads this first)`, `TrackedUniEditor.tsx`, `UniDetail.tsx`, `Components`, `StatusProgress.tsx`, `14 — New palette: "Ember" (from the owner's reference image)`, `Minor`, `Findings`, `components/index.ts`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **Are the 4 inferred relationships involving `Button()` (e.g. with `Primitives (`src/ui/components/`)` and `Steps`) actually correct?**
  _`Button()` has 4 INFERRED edges - model-reasoned connections that need verification._
- **What connects `./tsconfig.json`, `uniworld` to the rest of the system?**
  _2 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Onboarding.tsx` be split into smaller, more focused modules?**
  _Cohesion score 0.059841047218326324 - nodes in this community are weakly interconnected._
- **Why does `Provider` connect `Provider` to `Onboarding.tsx`, `SqlCounselorStore`, `ports.ts`, `ChatMessage`, `core/index.ts`, `useCounselor.ts`, `Finder.tsx`, `react`, `InMemoryCounselorStore`, `02 — Foundation, push 2: plugins, DB, keychain, shell, i18n (rest of M1)`, `eval-counselor.ts`, `finder/index.ts`, `tauri.ts`, `AiClient`, `contracts.ts`, `ai/types.ts`, `openrouter.ts`, `OpenRouterClient`, `providerChoice.ts`?**
  _High betweenness centrality (0.039) - this node is a cross-community bridge._
- **Are the 8 inferred relationships involving `ErrorNote()` (e.g. with `Primitives (`src/ui/components/`)` and `Steps`) actually correct?**
  _`ErrorNote()` has 8 INFERRED edges - model-reasoned connections that need verification._
- **Should `SqlCounselorStore` be split into smaller, more focused modules?**
  _Cohesion score 0.06376811594202898 - nodes in this community are weakly interconnected._