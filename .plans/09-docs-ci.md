# 09 — README, license, attributions, Windows build workflow (A plan §6)

Read first: `.plans/A-build-conventions.md`, `Design.md` (§1–§3, §5, §9), `.plans/B-core.md` ("Implementation status" for how the core works and its CLI scripts), `package.json` scripts, `docs/screenshots/` (real screenshots, already captured).

## Steps
- [x] 1. `LICENSE`: MIT, `Copyright (c) 2026 UniWorld contributors`.
- [x] 2. Replace the template `README.md` with a real one (plain, specific, no marketing tone, no emoji, sentence-case headings):
      - What UniWorld is (2–3 sentences: a desktop app that helps high-school students in IB, AP or US programs find real universities worldwide; a Socratic counselor helps them think about careers; every fact shown has a source link and a verified quote, or says "Not found — check official site").
      - Screenshots: embed `docs/screenshots/onboarding-dark.png`, `docs/screenshots/onboarding-name-light.png`, `docs/screenshots/finder-dark.png` with honest captions.
      - "Real data only" design: no mock data, no demo mode; ROR registry matching drops universities that aren't real; citation + quote check turns unsupported facts into "Not found"; results cached 30 days. Keep it to a short list.
      - Install: Windows installer from the GitHub Actions artifact / Releases (`.msi` / `.exe` built by the workflow below); "Bring your own key": how to get an OpenRouter key in ~2 minutes (openrouter.ai → sign in → Keys → Create key → paste in onboarding), and that keys stay in the OS keychain. OpenCode Go is optional and experimental (Counselor only).
      - Development: prerequisites (Bun, Rust stable, Tauri 2 system deps — link https://v2.tauri.app/start/prerequisites/), `bun install`, `bun tauri dev`, `bun run build`, `bun test`, `bun run check:i18n`, `bun run build:globe -- <path to ne_110m_admin_0_countries.geojson>`, `bun run build:ror` (B's). Linux note: on some Wayland compositors set `WEBKIT_DISABLE_DMABUF_RENDERER=1` before `bun tauri dev`.
      - Project layout: `src/ui`, `src/app`, `src/i18n`, `src/store`, `src/core` (AI, counselor, finder, grounding), `src-tauri`, `data/`, `scripts/` — one line each.
      - Languages: English, Español, Tiếng Việt.
      - Data attribution: ROR (CC0), Hipo university-domains-list (MIT), Natural Earth (public domain), `countries-list` (MIT), `country-flag-icons` (MIT), fonts (Agrave Pro, Inter — SIL OFL; IBM Plex Mono — SIL OFL).
      - AI tools disclosure: "Built with help from AI coding assistants. Person A's UI was planned and orchestrated with Claude Code (Claude Opus as orchestrator, Claude Haiku as builder, Claude Sonnet as reviewer); all generated code was reviewed and tested before commit. The app itself calls models through OpenRouter (default `deepseek/deepseek-v4.1-flash`) or OpenCode Go." Add a line: "Person B: add your tools here." (a visible TODO for the teammate, since we don't know theirs).
      - License: MIT.
- [x] 3. `.github/workflows/windows-build.yml`: triggers `workflow_dispatch` and `push` of tags `v*` (NOT every push). Job on `windows-latest`: checkout; `oven-sh/setup-bun@v2`; `dtolnay/rust-toolchain@stable`; `swatinem/rust-cache@v2` with `workspaces: src-tauri`; `bun install --frozen-lockfile` (fall back to `bun install` if the lockfile version differs — use plain `bun install`); `bun run build`; `bun test`; `bunx tauri build`; upload `src-tauri/target/release/bundle/**/*.msi` and `**/*.exe` (nsis) with `actions/upload-artifact@v4`. Pin action versions to the major tags shown.
- [x] 4. `tauri.conf.json` bundle: `"targets": ["nsis", "msi", "deb", "appimage"]` is fine to keep as `"all"`; set `"publisher": "UniWorld contributors"`, `"shortDescription"`, `"longDescription"`, `"category": "Education"`, and `"copyright"`. Window title stays `UniWorld`. Don't change the identifier.
- [x] 5. `src-tauri/Cargo.toml`: `description = "UniWorld: find real universities worldwide"`, `license = "MIT"`.

## Slice checks
- Conventions' Verify passes.
- `bunx tauri info` runs; `(cd src-tauri && cargo check)` passes after the metadata edits.
- README links to files that exist (`ls` each screenshot path you reference).

## Builder notes
- Step 1 to 5 done. LICENSE (MIT, 2026 UniWorld contributors); README rewritten from the plan, with the three screenshots (all paths exist); `.github/workflows/windows-build.yml` (workflow_dispatch + tags `v*`, pinned action majors, plain `bun install`, uploads msi/exe); `tauri.conf.json` bundle gained publisher, shortDescription, longDescription, category Education, copyright, identifier unchanged, targets left as "all"; `Cargo.toml` gained description and license. `authors = ["you"]` left untouched (template value, no names added).
- Verify (conventions):
  - `bun run build`: passed (vite built, tsc clean; Vite emitted only its usual chunk-size warning).
  - `bun run check:i18n`: passed (6 namespaces, es and vi match en).
  - `bun test`: 138 pass, 0 fail, 15 files.
  - `cd src-tauri && cargo check`: passed after metadata edits.
  - `WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 90 bun tauri dev`: app compiled and ran (`target/debug/uniworld`); no panic, no error lines. The only "error" lines are the SIGTERM notices from `timeout` stopping the dev script. Stopped the app with `pkill -x uniworld`.
- Slice checks: `bunx tauri info` ran and printed the app config; workflow YAML parses (checked with python yaml); README screenshot and link paths checked with `ls`.
- Deviations: none in content. The workflow was not run on GitHub (no remote run possible here), so the Windows build is unverified until the first `workflow_dispatch`.
