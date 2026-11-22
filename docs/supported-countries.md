# Finder: supported countries (Part B)

Last tested: **2026-11-22**, after the review fixes below, OpenCode Go key only
(official-page path, no web search).

Supporting every country well is out of scope for the hackathon. We deliberately
pick a small set, test it, and document it so A knows what to show and what to
expect. Everything else is **best-effort** and may return few or no results.

The canonical list is exported from the core:

```ts
import { SUPPORTED_COUNTRIES } from '@/core'; // ['US','CN','VN','DE','SE','ES','CO']
```

Use it to limit country pickers / onboarding to the tested set.

## Latest spot checks (one run each, same code)

| Country | Career tested | Verified | Notes |
|---|---|---|---|
| United States (`US`) | Computer Science | **5** | also Robotics → 6 |
| China (`CN`) | Computer Science | **5** | Chinese programme names kept verbatim |
| Vietnam (`VN`) | Computer Science | **4** | Electrical Engineering → 2 (below 3) |
| Germany (`DE`) | Medicine | **5** | Master's/MBA rows dropped |
| Sweden (`SE`) | Mechanical Engineering | **5** | Master's row dropped |
| Spain (`ES`) | Business | **3** | several MBA/master's dropped |
| Colombia (`CO`) | Computer Science | **4** | Data Science → 1 (weak, unstable) |

Results vary every run: the university list comes from an AI suggestion step
(same career, different model sample). Treat **>= 3 verified** as the pass bar
(`MIN_VERIFIED_RESULTS`). Earlier runs of the same countries with Computer
Science were higher (6–7) before the stricter quality filters; that is the
expected trade-off.

### Example verified rows

- **US**: University of Washington (Computer Science) · Georgia Tech (AI) ·
  Carnegie Mellon (Computer Science) · Amherst (Data Science)
- **CN**: Tsinghua (Computer Science) · Harbin Institute of Technology (软件工程) ·
  Xi'an Jiaotong (信息与计算科学)
- **VN**: Ton Duc Thang (Khoa học máy tính) · Vietnamese-German University
  (Information Technology) · Posts and Telecommunications Institute (Data Science)
- **DE**: Heidelberg (Medicine) · LMU München (Medicine) · Freiburg (Medicine) ·
  Bonn (Zahnmedizin)
- **SE**: Chalmers (Maskinteknik) · Örebro/Luleå/Halmstad (Maskinteknik) ·
  KTH (Robotics)
- **ES**: Ramon Llull (Business) · Comillas (Business) · Sevilla (Marketing)
- **CO**: Universidad del Valle (Ingeniería de Sistemas) · U. Nacional
  (Administración de Sistemas Informáticos) · UTP (Ingeniería de Sistemas y Computación)

## How it works (why these countries pass)

OpenCode has no web search, so Finder reads each university's own pages:

1. Suggest names → ground in ROR → stay in scope.
2. Fetch official pages **programme-first**: links/slugs are scored with English
   keywords **plus the country's local words** (`COUNTRY_HINTS` in
   `src/core/finder/webFetch.ts`).
3. **Evidence gate** (`src/core/finder/programme.ts`): keep a university only if
   a fetched page contains a specific requested keyword (whole-word for Latin,
   substring for CJK), **or** the programme name the model extracted appears
   verbatim on the page. The second rule is what makes Chinese / Vietnamese /
   Spanish / German / Swedish / Colombian sites work.
4. Every fact still needs a source URL + exact quote
   (`grounding/citationValidator`).

### Local hints per country

- `US`: `major(s)`, `undergraduate program`; `/academics`, `/majors`, `/programs`
- `CN`: 专业 本科 招生 院系 学院 学位 培养 学科; `zsxx`, `benke`, `zhuanye`
- `VN`: ngành, đào tạo, tuyển sinh, chương trình, khoa; `tuyen-sinh`, `dao-tao`, `nganh`
- `DE`: studiengang, studium, fakultät, fachbereich, bewerbung
- `SE`: utbildning, kandidatprogram, antagning, institution
- `ES`: grado(s), estudios, enseñanza, admisión, matrícula, facultad
- `CO`: pregrado, programas, admisiones, facultad, carrera

## Quality fixes after the review

- **Bachelor's only**: Master's/MBA/diploma/PhD rows are dropped with reason
  `not_bachelor` (heuristic on programme name + URL).
- **Whole-word matching**: "Art" no longer matches "start", "Arts" not "charts";
  CJK still uses substring. Short/generic keywords are ignored as evidence.
- **No duplicates**: verified results are deduped by ROR id before ranking; the
  cached branch dedupes too. `done.verified` equals unique rows.
- **Reasons reconcile**: grounding (`not_in_registry`, `out_of_scope`,
  `over_cap`), tuition (`tuition_not_free`), page (`programme_not_found`,
  `site_unreachable`), AI (`ai_answer_rejected`) and level (`not_bachelor`) now
  cover the removals; `sum(reasons) == removed` in the runs above.
- **Merge correctness**: free tuition wins regardless of candidate order; the
  programme name and its evidence URL/quote always come from the same candidate.
- **Fetch safety**: off-domain redirects are rejected; cache keys are normalized;
  rows without `html` are refetched; page text/HTML capped; full-text dedupe;
  country seeds are queued before generic guesses.
- **Timeouts**: 8s per page, 25s per university (3 in parallel), 60s detail,
  90s per provider call (stops a stalled request hanging a search).
- **Detail robustness**: a malformed detail reply returns "Not found" facts
  instead of the whole page failing with a JSON error.
- **Schema tolerance**: whole-fact `null`, `null` arrays, and string-for-array
  (`languages`/`exams`) are coerced, not rejected.

## Known weak spots

- **CO Data Science** and **VN non-CS** careers are unstable / often below 3.
- **US Robotics** mostly returns adjacent CS/AI degrees; few US schools list
  "Robotics" as a bachelor's programme on the fetched pages.
- Programme URLs are sometimes homepages or catalogues, not the exact page.
- Some results are `Zahnmedizin`/adjacent fields — real, but not the exact career.
- `*.edu.cn` subdomains (`study.`, `welcome.`) are unreachable from some networks.
- Results are **not deterministic** (the suggest step is an LLM call).

## Perf / cache

- Page text + HTML cached 7 days (`page_cache`, migrations 004 then 005); repeat
  runs are fast. A dev DB created before 005 refetches rows once to fill `html`.
- Detail: 8 pages, 60s deadline, 30-day detail cache.

## How to reproduce

```bash
bun run scripts/search.ts "Computer Science" US
bun run scripts/search.ts "Computer Science" CN
bun run scripts/search.ts "Computer Science" VN
bun run scripts/search.ts "Medicine" DE
bun run scripts/search.ts "Mechanical Engineering" SE
bun run scripts/search.ts "Business" ES
bun run scripts/search.ts "Computer Science" CO

# detail page (ROR id from a result)
bun run scripts/search.ts "Computer Science" CN --detail <ror-id> --refresh
```

## For A (UI)

- Additive contract: `done.reasons?: Record<RemovalReason, number>` and
  `SearchInput.degreeKeywords?: string[]`. `RemovalReason` now also has
  `not_bachelor` and `tuition_not_free`.
- If `done.reasons.programme_not_found` is high, show a softer message than
  "couldn't verify enough" (e.g. "this country's sites didn't list the programme").
- Guide users toward the 7 supported countries; other countries are best-effort.
- `UniResult.program` is the **verified** programme text; `programUrl` /
  `programQuote` carry the evidence.
