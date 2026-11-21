# Person A: App shell, UI, globe, local data

Read `00-how-we-work.md` and `Design.md` first. Branch: `feat/a-ui`.
You own: `src-tauri/`, `src/ui/`, `src/i18n/`, `src/app/`, `src/store/{profile,tracked,settings,secrets}.ts`, the globe and its data. Do not edit `src/core/**`.

## Order of work

### 1. Foundation (tonight, do first, B is waiting on the scaffold)
- [ ] Tauri 2 + Vite + React + TS + Tailwind + shadcn/ui, Zustand, Framer Motion, Zod
- [ ] Plugins: `tauri-plugin-sql` (SQLite), `tauri-plugin-http`, `keyring` crate (Rust commands `secret_get/set/delete`)
- [ ] `src/db/migrations/001_init.sql` from Design §6 (all tables), loaded on first launch
- [ ] App shell: sidebar/nav (Onboarding, Counselor, Finder, My Unis, Settings), "Beta" label, screen transitions
- [ ] i18next with `en`, `es`, `vi` (start with the nav and onboarding strings), English by default
- [ ] `src/core/stub.ts`-style dev stub is B's job to provide; until it lands, call `CoreApi` through a thin `useCore()` hook in `src/app/` so swapping is one line
- [ ] Push to `main` → **M1**

### 2. Onboarding (§7.1)
- [ ] 7 steps: welcome + language switch, name, primary + extra languages (A1–C2/Native), program, grades form per program (IB / AP / US, all optional), citizenship + residence (optional), AI key setup
- [ ] "Test connection" button calls `core.testConnection`. OpenRouter key required, OpenCode Go optional
- [ ] Keys go to the OS keychain only (never SQLite). Profile saved via `store/profile.ts`
- [ ] If primary language is es/vi, offer to switch the interface to it
- [ ] First launch routes to onboarding; afterwards to the Counselor

### 3. Globe + Finder UI (§7.3)
- [ ] Bundle Natural Earth 110m polygons + country→continent map (all ISO codes)
- [ ] `globe.gl`: idle auto-rotation, atmosphere glow, hover lift + tooltip, continent chips with camera fly-to tween and highlight, country click toggles selection, scope chips under the globe
- [ ] Inputs: career chips (saved careers + free text), 3 filters (third and second defaults per Design)
- [ ] "Search" → globe shrinks to the side; call `core.finder.search`, show live progress messages, stream cards in sorted by fit with animation
- [ ] Result card: name, flag, city, overview, program, language badges, tuition badge, fit label, "Why this fits you", source count
- [ ] Detail page: every fact with an "official"/"third-party" tag, hover/"show source quote" (quote + link), "Not found — check official site" for nulls, "Last checked", Refresh button, **Add to my list**
- [ ] Rendering rule: a `Fact` with `value === null` is always shown as "Not found — check official site". Never show a value without its source link.

### 4. Counselor UI (§7.2)
- [ ] Chat UI with streaming, shows the 6 fixed intake questions one at a time (translated en/es/vi), then Socratic follow-ups via `core.counselor.send`
- [ ] 4 importance sliders (Passions, Strengths, Goals, Earning potential, 1–10)
- [ ] "Show my career ideas" enabled after ~8 student messages → `core.counselor.careers`
- [ ] Career cards with **Save** and **Find universities →** (opens Finder with that career prefilled)

### 5. Uni Manager (§7.4) + Settings (§7.5)
- [ ] Table/cards: name, country, program, language, deadline, exams, status, notes; editable fields
- [ ] Statuses: Considering → Preparing → Applied → Waiting → Admitted / Waitlisted / Rejected
- [ ] Sort by nearest deadline; red badge when < 30 days
- [ ] Click a row → detail page from cache
- [ ] Settings: edit profile, UI language, provider keys + Test, model ID field, "Clear all my data"

### 6. Polish and submission (Sun 16:00–20:30)
- [ ] Translate everything to es/vi (cut-list item 2 if short on time)
- [ ] Animations, empty states, error states (missing key message from §5.1)
- [ ] Windows installer via `tauri build`
- [ ] README (what it does, screenshots, installer, dev setup, real-data design), MIT license, attributions (ROR CC0, Hipo MIT, Natural Earth), AI-tools disclosure
- [ ] Make the repo public: `gh repo edit --visibility public --accept-visibility-change-consequences`
- [ ] Record the demo (outline in Design §9), 2–3 min

## Working without B's code
Until B's real `CoreApi` lands (M3), develop against a stub that returns **clearly fake placeholder shapes** only for layout work. Delete it before the freeze. Nothing fake ships or appears in the video.

## Requests (add things you need from B here)
- 

## Done = 
Onboarding → Counselor → Finder → Uni Manager works on Windows with a real key, in all three UI languages.
