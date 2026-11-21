# UniWorld: Design

*Working name; rename freely. Written 2026-11-21 for EvoHacks II.*

## 1. Intent

High-school students near graduation often don't know which career fits them, or which universities around the world offer it at a price they can pay, in a language they speak, with requirements they can meet. UniFinder is a desktop app that:

1. Gets to know the student (onboarding).
2. Helps them find career directions through a Socratic AI counselor that asks questions rather than giving answers.
3. Finds **real** universities for those careers anywhere in the world, chosen on an interactive 3D globe and ranked for this particular student.
4. Tracks the universities they shortlist, with deadlines, required exams and application status.

**The one rule that defines the product: important facts are never invented.** Every university must be real, and every important fact (tuition, deadline, language, requirements) must come with a source link. The AI may write the connecting text around the facts, but not the facts themselves. If a fact can't be found, the app says "Not found — check official site."

## 2. Context and constraints

- **Event:** EvoHacks II, an online hackathon for high-school students.
- **Deadline:** submissions close **Sun 2026-11-22, 12:00 PM PST (21:00 Swedish time)**. Judging runs 12:00–2:30 PM PST.
- **Team:** 2 people. All code is written with AI agents; the rules allow this, but major AI tools must be disclosed and the team must be able to explain the project.
- **Submission (based on EvoHacks I; the EvoHacks II details aren't published yet):**
  - project description
  - **public repo**
  - **2–3 minute demo video**
  - working build **or** local setup instructions
- **Judging (EvoHacks I):** impact and usefulness, technical execution, creativity, presentation (including AI integration, originality, demo and documentation).
- **Theme:** the EvoHacks II theme was "coming soon" on the site. Fit the pitch to it once it's known.
- **Dev machine (checked):**
  - Present: Node 25, Bun 1.3, Rust 1.94, Git, dotnet 8, Android SDK at `%LOCALAPPDATA%\Android\Sdk`.
  - Missing or broken: `adb` isn't on PATH; Java/JDK is broken; there's no Android NDK; Flutter and Python aren't installed.
- **Bring your own key:** the student pastes their own AI API key. There is no server and there are no accounts. All data stays on the device.
- **Minors:** most users are under 18. Store only what each feature needs, keep everything local, and send the AI provider only what each task needs. Request zero data retention on OpenRouter (`provider: { zdr: true }`) where the model supports it. For a real launch, get a legal review (COPPA, GDPR rules for minors, Vietnam's PDPL). That review is out of scope for the hackathon.

## 3. Goals, non-goals, anti-goals

**Goals (demo):**
- Onboarding → Counselor → Finder → Uni Manager works end to end on Windows.
- Interface in English, Spanish and Vietnamese (English by default). The AI always replies in the student's primary language.
- Students in the IB, AP and US standard systems.
- A 3D globe with polished animations, since it's the visual highlight of the video.
- Real-data grounding that's visible on screen: progress messages, the rejected count, and source links.

**Non-goals (for now):**
- Other national curricula.
- Postgraduate, associate and short-cycle degrees (**bachelor's only**).
- Accounts and cloud sync.
- Push or deadline notifications.
- Application essay help.
- Payments.
- An Android build. It's a stretch goal and the first thing cut (see §11).

**Anti-goals (failure even if the app technically works):**
- A university that doesn't exist, or a made-up deadline, tuition figure or requirement.
- A counselor that tells the student what to be instead of helping them work it out.
- A plain, unranked list of universities.
- Mock or seeded data. This is a **beta** that runs on real data: real searches, real profiles. The demo video is recorded from a real session, and it can be retaken.

## 4. Approaches considered

| | Approach | Trade-off | Verdict |
|---|---|---|---|
| **A** | **Tauri 2 + React/TypeScript** | Small installer (~10 MB). Web-based 3D globes are the best available. Can build for Android later (needs a JDK and the NDK). Rust is already installed. | **Chosen.** The team suggested Tauri; it was presented as the recommendation and not objected to. |
| B | Electron + React/TypeScript | The most mature tooling and the most reliable AI-written code, but a ~100 MB installer and no route to Android. | Not chosen |
| C | Flutter | Desktop and Android from one codebase, but Flutter isn't installed and good 3D globes are rare. | Not chosen |

**Inside A, the call made here:** the app's logic (AI calls, grounding, ranking) lives in **TypeScript**. Rust handles only the operating-system jobs: secure key storage, SQLite, and network calls without CORS limits. That keeps most of the code in one language, which is faster to iterate on.

## 5. Architecture

```
┌──────────────────── Tauri 2 desktop app ─────────────────────┐
│ React + TS UI (i18next: en / es / vi)                        │
│  Onboarding │ Counselor │ Finder (3D globe) │ My Unis │ Set. │
│ ──────────────────── TypeScript core ─────────────────────── │
│ ai/        provider clients (OpenRouter, OpenCode Go)        │
│ counselor/ intake, Socratic loop, career synthesis           │
│ finder/    query → web search → extract → verify → rank      │
│ grounding/ ROR matcher, citation validator, schemas          │
│ store/     typed access to SQLite                            │
│ ─────────────────────── Rust side ────────────────────────── │
│ tauri-plugin-sql (SQLite) │ OS keychain (keyring crate)      │
│ tauri-plugin-http (network without CORS limits)              │
│ Bundled: ROR universities file + country→continent map       │
│          + Natural Earth country polygons                    │
└──────────────────────────────────────────────────────────────┘
        │ direct HTTPS with the student's own key
        ├─► OpenRouter   (chat + web search; required for Finder)
        └─► OpenCode Go  (chat only, experimental; Counselor only)
```

**Stack (my calls; the builder may swap equivalents):**
- Vite, React, TypeScript, Tailwind with shadcn/ui
- Framer Motion for screen transitions
- Zustand for app state
- Zod for checking every AI JSON response against its schema
- i18next for translations
- `globe.gl` (three.js) for the globe

### 5.1 AI providers

Settings has two provider slots. Each key is stored in the operating system's keychain, never in SQLite or in plain text.

| Provider | Base URL | Used for | Notes |
|---|---|---|---|
| **OpenRouter** (primary, **required for Finder**) | `https://openrouter.ai/api/v1` | Counselor, Finder, university details | Default model `deepseek/deepseek-v4.1-flash` (editable field). Web search: the `openrouter:web_search` server tool or the `web` plugin (Exa engine, about $0.007 per search). Send `provider: { zdr: true }`. |
| **OpenCode Go** (optional, marked "experimental") | `https://opencode.ai/inference/go/openai/v1` | Counselor chat only | Model `deepseek-v4.1-flash`; a workspace admin must first set Privacy › Regions to "Global". Has **no web search**. Requires `User-Agent: unifinder/1.0` and a stable `x-opencode-session` header per conversation. Its terms target coding agents, so non-coding use may be flagged. |

If the only key is OpenCode Go, the Finder shows: "University search needs an OpenRouter key (for verified web search)."

Prices checked 2026-11-21: DeepSeek V4.1 Flash costs about $0.05 per 1M input tokens and $0.20 per 1M output tokens. A full demo session should cost well under $0.10.

### 5.2 Bundled data (all CC0, MIT or public domain)

- **ROR dump v2.16** (Zenodo, CC0), filtered to `types: education` (~31k institutions).
  - Preprocessed once by a build script into `universities.json` or a SQLite table.
  - Fields: `ror_id, name, aliases[], acronyms[], country_code, city, lat, lng, website, domains[]`.
  - Domains are merged in from the **Hipo university-domains-list** (MIT), matched by name and country.
- **Country → continent map**, covering all ISO codes.
- **Natural Earth 110m country polygons** (public domain) for the globe. The globe works offline.

## 6. Data model (SQLite)

```
profile          (id=1, name, primary_lang, ui_lang, citizenship_country?,
                  residence_country?, program: 'IB'|'AP'|'US',
                  grades_json?, created_at, updated_at)
profile_language (lang_code, level: A1|A2|B1|B2|C1|C2|native)
counselor_session(id, started_at, provider, weights_json, status)
counselor_message(id, session_id, role, content, created_at)
career_path      (id, session_id, title, summary, why_you, degree_keywords_json,
                  fit_breakdown_json, saved: bool)
uni_search       (id, careers_json, scope_json, filters_json, created_at,
                  results_json, rejected_count)
uni_detail_cache (ror_id, program_key, detail_json, checked_at)  -- TTL 30 days
tracked_uni      (id, ror_id, program_name, status, deadline?, required_exams_json,
                  language, country_code, notes, added_at, updated_at)
settings         (key, value)  -- non-secret only; API keys live in the OS keychain
```

**Grades (`grades_json`), all optional:**
- **IB:** `{ predictedTotal /45, subjects:[{name, level:HL|SL, score 1–7}] }`
- **AP:** `{ gpa, exams:[{name, score 1–5}] }`
- **US:** `{ gpaUnweighted /4.0, sat?, act? }`

**Every important fact** in `detail_json` and `results_json` has this shape:

`{ value | null, sourceUrl | null, quote | null, sourceKind: 'official'|'third_party', checkedAt }`

`quote` is a short exact excerpt from the search-result text that supports the value (see the quote check in §7.3).

## 7. Features

### 7.1 Onboarding (first launch, about 1 minute)

1. **Welcome.** Interface language is English by default, with a switcher offering Español and Tiếng Việt.
2. **Name.** The AI uses it to address the student.
3. **Primary language** (searchable list). Then optional **additional languages**, each with a level (A1–C2 or Native). If the primary language is es or vi, offer to switch the interface to it.
4. **Academic program:** IB, AP or US standard.
5. **Grades (optional)**, with a form matching the program. A note explains: "helps us suggest realistic options."
6. **Citizenship and country of residence (optional, my call).** Tuition-free status often depends on these. For example, Swedish universities are free for EU/EEA students but not for others. Without them, the cost-fit badge reads "depends on citizenship."
7. **AI key setup:** paste an OpenRouter key, with a "Test connection" button. An OpenCode Go key is optional.

### 7.2 Counselor

1. **Intake.** Six fixed questions, translated into all three languages and shown one at a time as chat:
   1. passions: what you'd do even if nobody asked
   2. strengths: what others come to you for
   3. favorite subjects and why
   4. long-term goals: life at 30
   5. values: impact, stability, creativity, money, freedom…
   6. practical limits: budget, distance from home, languages you'd study in
2. **Importance sliders (1–10)** for **Passions, Strengths, Goals and Earning potential**. Saved on the session.
3. **Socratic follow-ups.** The system prompt makes the AI:
   - address the student by name, in their primary language
   - ask **one question at a time**, building on the student's last answer
   - reflect back what it heard, and point out tensions ("you love art but rated earning 9/10 — how do you see those fitting together?")
   - **never prescribe a career** during this phase
   - keep replies short
4. **"Show my career ideas"** becomes available after about 8 student messages (the student can also keep chatting). The AI returns structured JSON with **3–5 careers**: title, summary, a "why you" grounded in the student's own answers, a fit breakdown weighted by the sliders, and degree keywords (for example "Computer Science", "Data Science").
5. **Career cards** have **Save** and **Find universities →**, which opens the Finder with that career already filled in.

### 7.3 University Finder (core feature)

**Inputs:**
- **Career paths:** chips from saved careers, plus free text.
- **Scope**, set on the **3D globe**:
  - **Global**
  - **Continent**, from a chip row: Africa, Asia, Europe, North America, South America, Oceania
  - **One or more countries**, by clicking them on the globe
- **Filters:**
  - "Tuition-free only"
  - "Taught in a language I speak" (on by default)
  - "Also show universities taught in languages I'd need to learn" (off by default)

**Globe behavior:**
- Slow auto-rotation while idle, with an atmosphere glow.
- Hovering a country lifts and highlights it and shows a tooltip.
- Clicking a continent chip highlights all its countries and flies the camera there with a smooth tween.
- Clicking a country toggles its selection.
- The selected scope is shown as chips under the globe.
- On "Search", the globe shrinks to the side and result cards animate in.

**Pipeline (each run):**
1. **Plan queries.** The AI writes 2–3 search queries from the careers, scope, filters, the student's languages and their program. Example: "bachelor Computer Science taught in English tuition-free Germany".
2. **Web search** through OpenRouter (Exa) to get candidate pages and their citation URLs.
3. **Extract.** The AI returns JSON candidates: `{ name, country, programName, instructionLanguages[], tuition{…fact}, overview, sourceUrls[] }`.
4. **Verify (code, not AI):**
   - **Match each candidate to a ROR record.** The best signal is a source URL whose domain matches a university domain in ROR. Otherwise, match the normalized name plus country against the name, aliases and acronyms.
   - **No match means the candidate is dropped** and counted as "removed."
   - **Each fact's `sourceUrl` must be one of the citation URLs the search actually returned.** Otherwise the fact is set to `null`.
   - **Quote check (decided by the team):** every fact must include a short exact `quote` (about 5–30 words) copied from that source's returned text. Code checks that the quote appears in the text returned for that URL, after normalizing whitespace, case and punctuation. **If the quote isn't there, the fact becomes `null`** ("Not found — check official site").
     - The quote must contain the value, or something that clearly implies it. For example, the quote "no tuition fees for any students" supports the value "Free".
     - The search must therefore return page text or excerpts the code can read (not only URLs), and the extraction step must receive that same text.
   - In the UI, each fact has a hover or "show source quote" link that shows the quote and opens the URL.
5. **Rank.** The AI scores each verified university, from only the verified facts plus the profile, on:
   - 🎯 **Career fit**
   - 📊 **Admission fit:** **Reach / Match / Safety / Unknown**, comparing published requirements with IB, AP or GPA; "Unknown" if requirements aren't published
   - 🗣️ **Language fit**
   - 💰 **Cost fit**

   It also writes a one-line **"Why this fits you"** that names real profile facts, for example "Taught in English (your C1) · tuition-free · your IB 38 meets their 36." Results are sorted by overall fit.
6. **Live progress:** "Searching the web… → Checking 18 candidates against the university registry… → 12 verified, 6 removed." Cards stream in as they're verified, with a maximum of 12 per search.

**Result card:**
- name, flag, city
- one-line overview
- matched program
- language-of-instruction badges
- tuition badge: Free / Paid (~amount) / Free for EU-EEA / Unknown
- fit label and the "Why this fits you" line
- source count

**"A language I speak" means level B2 or higher, or Native (my call).** B2 is the usual minimum universities ask for. A1–B1 count as "needs to learn" and get the note "you're at B1; they usually ask for B2/C1."

Universities taught in a language the student doesn't speak only appear when the third filter is on, with a "You'd need to learn [language]" note and the usual required level, if it's sourced.

**Detail page.** It opens when a card is clicked and is cached for 30 days, with a **Refresh** button. A second web search is aimed at the university's own domain (`include_domains` where the search engine supports it). It shows:
- overview and the specific program
- language(s) of instruction
- tuition, plus scholarships if found
- **application deadlines**
- required exams or tests (SAT/ACT/IB/AP policies, language tests such as IELTS or TOEFL)
- entry requirements
- application route (portal)
- "Last checked [date]"

Each fact has a source link and an "official" or "third-party" tag. A missing fact shows "Not found — check official site."

**"Add to my list"** saves the university's ROR ID and program to the tracker, along with the deadline, exams, language and country from the detail page.

### 7.4 Uni Manager ("My Universities")

- A table or cards for each tracked university:
  - name, country, program, language
  - **application deadline**
  - **required exams**
  - **status**
  - notes
- Statuses: **Considering → Preparing → Applied → Waiting → Admitted / Waitlisted / Rejected**. The student changes them by hand.
- Fields filled from the detail page can be edited.
- Sorted by nearest deadline. **A red badge marks deadlines less than 30 days away.**
- Clicking a row reopens its detail page (from the cache).

### 7.5 Settings

Settings is a single page:
- profile editing
- interface language
- provider keys (with "Test connection") and the model ID
- "Clear all my data"

## 8. Prompts (left to the builder, with these requirements)

- Every AI call that returns data uses JSON schema or structured output, is checked with Zod, and is retried once on failure.
- Prompts are written in English. The language the student sees is set by a `respond_in: <primary_lang>` instruction.
- The extraction prompt says: *use only information present in the provided search results; if absent, return null; every fact must cite one of the given URLs and include an exact quote copied from that URL's text.*
- The same quote check applies to the detail page (§7.3).
- The ranking prompt receives only verified facts, never the raw search text, so it can't add new facts.

## 9. Demo and submission plan

- **Beta, real data only (decided by the team):**
  - No mock data, no seeded profile, no demo mode.
  - Judges use the app with their own OpenRouter key; the README explains how to get one in about 2 minutes.
  - The app shows a small "Beta" label.
- **Video:** record a real session start to finish, from a fresh install with a real student profile. Retake as needed. Searches the app has already run are cached, so a retake doesn't have to wait for them again.
- **Video outline (2–3 min):**
  1. the problem, in 15 seconds
  2. onboarding
  3. Counselor with sliders, then career cards
  4. globe fly-to, then the live verification counter
  5. detail page with source links
  6. "Add to my list" → Uni Manager
  7. switch to Vietnamese to show the translations
- **Repo:** public on GitHub.
  - README: what it does, screenshots, a **Windows installer** (`.msi` or `.exe` from `tauri build`), dev setup steps, and the "real data only" design.
  - **AI-tools disclosure.**
  - MIT license.
  - Data attribution (ROR CC0, Hipo MIT, Natural Earth).

## 10. Suggested timeline (Swedish time)

| When | What |
|---|---|
| Sat 23:00–01:00 | Set up the Tauri project, SQLite, keychain, ROR preprocessing script, translation setup, screen layout and navigation |
| Sun 08:00–12:00 | Person A: onboarding, globe, Uni Manager. Person B: AI client, Counselor, Finder pipeline, ROR verification and quote check |
| Sun 12:00–16:00 | Detail page, ranking, joining everything up, translations |
| Sun 16:00–18:00 | Polish animations, run a real end-to-end session, build the Windows installer. **Feature freeze 18:00** |
| Sun 18:00–20:00 | Video, README, Devpost text |
| Sun 20:30 | Submit (buffer before 21:00) |

## 11. Cut order if time runs short

1. Android build
2. Polish of the es/vi interface translations (the AI still replies in the student's language)
3. The Refresh button on detail pages
4. OpenCode Go provider
5. Detail-page extras (scholarships, application route)

**Never cut:** the end-to-end flow, real-data verification (ROR match and quote check), source links, and the globe.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Web search gives thin results for a scope | Run 2–3 queries; show "Couldn't verify enough results, try a narrower scope." Never pad with guesses. |
| AI returns invalid JSON | Structured output plus Zod plus one retry |
| ROR name matching misses (for example a translated name) | Match on aliases and acronyms plus the domain from the source URL; unit-test the matcher on ~20 known cases |
| Live API failure during judging | The video is recorded beforehand; every real search is cached locally. Judges use their own key. |
| Quote check marks many facts "Not found" | Accept it; that's the honest result. Use "Refresh" with a domain-targeted search to fill gaps. Never relax the check. |
| Android toolchain missing (JDK, NDK) | Android is cut first; attempt it only if ahead of schedule |
| OpenCode Go flags non-coding traffic | It's optional and marked experimental; OpenRouter is the main provider |

## 13. Left to the builder

- Exact prompt wording.
- Component library details and visual style, as long as it stays polished and animated.
- How the ROR data is preprocessed and stored: JSON loaded into memory, or a SQLite table with FTS.
- The fuzzy-matching algorithm and its thresholds.
- Whether web search uses the `openrouter:web_search` server tool or the `web` plugin.
- Final tuning of the ranking weights.
- Which tests to write. Minimum: the ROR matcher, the citation validator, and the Zod schemas.

## 14. My calls (not explicitly decided by the team)

- Working name "UniFinder".
- The stack libraries in §5.
- The optional citizenship and residence fields.
- A 30-day cache lifetime.
- Up to 12 results per search.
- How quotes are normalized for the quote check, and how currency or wording variants are handled (the quote itself must still match).
- The timeline and team split.
- "Speaks a language" means B2 or higher, or Native.
- The tracker's deadline field holds the next upcoming deadline for international first-year applicants; the full list stays on the detail page.
- Result cards stream in and are placed by fit score, moving into position with an animation.
