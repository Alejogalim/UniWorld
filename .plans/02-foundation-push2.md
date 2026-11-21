# 02 — Foundation, push 2: plugins, DB, keychain, shell, i18n (rest of M1)

Branch: `feat/a-ui` (already checked out). Read `Design.md` §5, §6 and `src/core/contracts.ts` first.

## Hard rules for the builder
- Do NOT edit or delete: `src/core/**`, `Design.md`, `.plans/**` (except checkboxes + "Builder notes" in this file).
- Do NOT commit, push, or switch branches. The orchestrator reviews and commits.
- bun only. Non-interactive commands only.
- No fake data anywhere. Placeholder screens show only a translated title + one-line "coming soon" empty state.
- If a step fails twice, stop and document it under "Builder notes".
- On this machine `tauri dev` needs `WEBKIT_DISABLE_DMABUF_RENDERER=1` (Wayland bug). Use it in your commands, but do NOT put it in package.json or any committed file.

## Steps

### Rust side (`src-tauri/`)
- [x] 1. `cd src-tauri && cargo add tauri-plugin-sql --features sqlite && cargo add tauri-plugin-http && cargo add keyring` and `bun add @tauri-apps/plugin-sql @tauri-apps/plugin-http`.
- [x] 2. **keyring backends.** The keyring crate silently uses an in-memory mock store unless native features are enabled. Enable the native backends for Windows, macOS and Linux Secret Service. Check `cargo info keyring` / the crate docs for the exact feature names of the installed version (v3: `apple-native`, `windows-native`, `sync-secret-service`; plus `crypto-rust` if required).
- [x] 3. In `src-tauri/src/lib.rs` add three commands, using service name `com.uniworld.app` and the account = provider name:
      - `secret_get(account: String) -> Result<Option<String>, String>` (missing entry → `Ok(None)`, not an error)
      - `secret_set(account: String, value: String) -> Result<(), String>`
      - `secret_delete(account: String) -> Result<(), String>` (missing entry → `Ok(())`)
      Register them with `invoke_handler`. Register `tauri_plugin_http::init()` and `tauri_plugin_sql::Builder::default().add_migrations("sqlite:uniworld.db", migrations).build()`.
- [x] 4. Migrations: one `tauri_plugin_sql::Migration { version: 1, description: "init", sql: include_str!("../../src/db/migrations/001_init.sql"), kind: MigrationKind::Up }`. Add `"plugins": { "sql": { "preload": ["sqlite:uniworld.db"] } }` to `tauri.conf.json` so migrations run on first launch.
- [x] 5. `capabilities/default.json` permissions: `core:default`, `sql:default`, `sql:allow-execute`, `sql:allow-select`, `sql:allow-load`, and http fetch scoped to exactly these hosts:
      ```json
      { "identifier": "http:default", "allow": [ { "url": "https://openrouter.ai/*" }, { "url": "https://opencode.ai/*" } ] }
      ```
- [x] 6. Window in `tauri.conf.json`: 1200×800, `minWidth` 960, `minHeight` 640, title `UniWorld`.
- [x] 7. A Rust unit test in `lib.rs` (`#[cfg(test)]`) that runs set → get → delete → get (expects `None`) on account `__uniworld_selftest__`.

### Database (`src/db/`)
- [x] 8. `src/db/migrations/001_init.sql`: every table from Design §6, exactly these names and columns, plus sensible types/constraints:
      - `profile` (id INTEGER PRIMARY KEY CHECK (id = 1), name, primary_lang, ui_lang CHECK in ('en','es','vi'), citizenship_country NULL, residence_country NULL, program CHECK in ('IB','AP','US'), grades_json NULL, created_at, updated_at)
      - `profile_language` (lang_code TEXT PRIMARY KEY, level CHECK in ('A1','A2','B1','B2','C1','C2','native'))
      - `counselor_session` (id INTEGER PK AUTOINCREMENT, started_at, provider, weights_json, status)
      - `counselor_message` (id PK, session_id REFERENCES counselor_session(id) ON DELETE CASCADE, role, content, created_at)
      - `career_path` (id PK, session_id REFERENCES counselor_session(id) ON DELETE CASCADE, title, summary, why_you, degree_keywords_json, fit_breakdown_json, saved INTEGER NOT NULL DEFAULT 0)
      - `uni_search` (id PK, careers_json, scope_json, filters_json, created_at, results_json, rejected_count)
      - `uni_detail_cache` (ror_id, program_key, detail_json, checked_at, PRIMARY KEY (ror_id, program_key))
      - `tracked_uni` (id PK, ror_id, program_name, status CHECK in ('considering','preparing','applied','waiting','admitted','waitlisted','rejected') DEFAULT 'considering', deadline NULL, required_exams_json, language, country_code, notes, added_at, updated_at)
      - `settings` (key TEXT PRIMARY KEY, value TEXT) — comment: never API keys.
      Timestamps are ISO TEXT. Add an index on `counselor_message(session_id)` and `tracked_uni(deadline)`.
- [x] 9. `src/db/client.ts`: `export async function getDb(): Promise<Database>` returning one cached `Database.load('sqlite:uniworld.db')` (from `@tauri-apps/plugin-sql`). This is the single DB handle both A's and B's stores use.

### Stores (`src/store/`)
- [x] 10. `src/store/secrets.ts`: `getSecret(p: Provider)`, `setSecret(p: Provider, v: string)`, `deleteSecret(p: Provider)` wrapping `invoke('secret_get' | 'secret_set' | 'secret_delete', { account: p })`. `Provider` imported from `@/core/contracts`.
- [x] 11. `src/store/profile.ts`: Zustand store `useProfile` with `{ profile: Profile | null; loaded: boolean; load(): Promise<void>; save(p: Profile): Promise<void> }`. `load` reads `profile` row id=1 + `profile_language` rows and maps to the contract's `Profile` (snake_case → camelCase, `grades_json` → `grades`). `save` upserts row id=1 and replaces all `profile_language` rows. Uses `getDb()`.

### App shell (`src/app/`, `src/ui/`)
- [x] 12. `bun add react-router i18next react-i18next`. Use `createMemoryRouter` + `RouterProvider` (desktop app, no URL bar).
      Routes: `/onboarding`, `/counselor`, `/finder`, `/my-unis`, `/settings`. Put the router in `src/app/router.tsx`.
- [x] 13. First-launch gate in `src/app/`: on startup call `useProfile.load()`; while loading show a small centered spinner; then redirect `/` → `/onboarding` if `profile === null`, else `/counselor`.
- [x] 14. Layout `src/ui/layout/AppShell.tsx`: left sidebar (≈220px) with the app name "UniWorld" + a small "Beta" badge, then the 5 nav items (lucide icons: Sparkles/onboarding, MessageCircle/counselor, Globe/finder, ListChecks/my-unis, Settings/settings) with an active state, and the `<Outlet/>` on the right. Screen transitions: Framer Motion `AnimatePresence` keyed on the route path, a short fade + 8px slide (~180ms).
- [x] 15. Placeholder screens in `src/ui/screens/{Onboarding,Counselor,Finder,MyUnis,Settings}.tsx`: translated title + translated "coming soon" line. No fake data.
- [x] 16. `src/app/core.ts` + `src/app/useCore.ts`: `core.ts` exports `export const core: CoreApi = notConnected;` where `notConnected` implements every `CoreApi` method by rejecting with `new Error('Core not connected yet')`. `useCore()` returns `core`. Swapping to B's stub or the real core later must be a one-line change in `core.ts`.

### i18n (`src/i18n/`)
- [x] 17. `src/i18n/index.ts` init i18next with `react-i18next`, `fallbackLng: 'en'`, `lng: 'en'`, namespaces `common` and `onboarding`, resources imported from `src/i18n/locales/{en,es,vi}/{common,onboarding}.json`. Import it in `main.tsx`.
      - `common`: app name, beta, nav labels (5), "coming soon", loading, the 5 screen titles.
      - `onboarding`: strings for the 7 steps in Design §7.1 / A-frontend.md step 2: welcome title + subtitle, language switch label, name label/placeholder, primary language, extra languages, level labels A1–C2 + Native, program (IB/AP/US), grades (optional) labels for IB predicted total + subjects HL/SL, AP GPA + exams, US unweighted GPA/SAT/ACT, citizenship, residence (optional), AI key setup (OpenRouter required, OpenCode Go optional/experimental), "Test connection", next/back/finish, "Switch the interface to {{lang}}?".
      Write real Spanish and Vietnamese translations (natural, not word-by-word).
- [x] 18. A small UI-language switcher (en/es/vi `<select>` or shadcn-style buttons) in the sidebar footer that calls `i18n.changeLanguage`. Temporary until Settings; fine to keep.
- [x] 19. `scripts/check-i18n.ts`: for every namespace, assert es and vi have exactly the same key set as en (deep keys); exits 1 and prints missing/extra keys otherwise. Add `"check:i18n": "bun scripts/check-i18n.ts"` to package.json.

## Verify (run all, paste short results in "Builder notes")
```bash
bun run build
bun run check:i18n
(cd src-tauri && cargo check && cargo test)
secret-tool search service com.uniworld.app   # after cargo test: must print nothing (test cleaned up)
rm -f ~/.local/share/com.uniworld.app/uniworld.db
WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 90 bun tauri dev   # no panic
sqlite3 ~/.local/share/com.uniworld.app/uniworld.db ".tables"   # must list all 9 tables + _sqlx_migrations
```
Also, to prove the keychain is real (not the mock store): temporarily `secret_set` from the test without deleting, run `secret-tool search service com.uniworld.app` and confirm it appears, then remove that change and clear the entry. Note the result.

## Done =
All boxes ticked, all verify commands green, no file outside the allowed folders changed (`src-tauri/`, `src/app/`, `src/ui/`, `src/i18n/`, `src/store/{profile,secrets}.ts`, `src/db/`, `scripts/check-i18n.ts`, `src/main.tsx`, `src/App.tsx`, `package.json`, `bun.lock`, this file).

## Builder notes
- Step 1–2 (deps, keyring): `cargo add keyring` resolved to **keyring 4.2.0**, not v3. Its default `v1` feature already enables the native stores for macOS (keychain), Windows (credential manager) and Linux (Secret Service via zbus), and it errors instead of falling back to a mock store. Kept the default; no feature flags added. Plugins: tauri-plugin-sql 2.6.0 (sqlite), tauri-plugin-http 2.9.0, @tauri-apps/plugin-sql 2.6.0, @tauri-apps/plugin-http 2.9.0.
- Steps 3–7: commands, migration, preload, capabilities and window are in place. `cargo test` runs `keychain_roundtrip` (set/get/delete/get, passes).
- Steps 8–9: schema in `src/db/migrations/001_init.sql`; `getDb()` in `src/db/client.ts`.
- Steps 10–11: `src/store/secrets.ts`, `src/store/profile.ts`.
- Steps 12–16: router (`src/app/router.tsx`, memory router), first-launch gate (`src/app/FirstLaunchGate.tsx`), `AppShell` with Framer Motion fade/slide, placeholder screens, `src/app/core.ts` (all methods reject with "Core not connected yet").
- Steps 17–19: i18n resources (en/es/vi, `common` + `onboarding`), sidebar language switcher, `scripts/check-i18n.ts` + `check:i18n` script in package.json.

Verify results:
- `bun run build`: passes (tsc + vite build).
- `bun run check:i18n`: "i18n key check passed (2 namespaces, es, vi match en)".
- `cargo check` and `cargo test`: pass. `keychain_roundtrip` ok.
- `secret-tool search service com.uniworld.app` after cargo test: no output.
- Real-keychain proof: a temporary test called `secret_set("__uniworld_proof__")` without delete. `secret-tool search` then showed `label = keyring:__uniworld_proof__@com.uniworld.app`, `secret = proof`, `attribute.service = com.uniworld.app`. The temp test was removed from `lib.rs`, and the entry was cleared with `secret-tool clear service com.uniworld.app username __uniworld_proof__`. Final search is empty.
- `WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 90 bun tauri dev`: no panic, exit 124 (timeout, expected).
- `.tables` on the real DB lists all 9 tables plus `_sqlx_migrations`, with migration `1|init|1`.

Deviations from the Verify commands:
- The DB location is `~/.config/com.uniworld.app/uniworld.db`, not `~/.local/share/...`. tauri-plugin-sql resolves to the app config dir. The `.local/share` path does not exist for this app. Use the `.config` path in the verify commands.
- The `secret-tool clear` attribute is `username`, not `account`.
- `keyring` is v4.2.0 (see step 1–2 notes).
