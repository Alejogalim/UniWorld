# A — build conventions (every builder reads this first)

Context: UniWorld is a Tauri 2 desktop app. Person A owns the UI; Person B owns `src/core/**` (already implemented, real, tested).
Source of truth: `Design.md` (product), `DESIGN.md` (visual system: "The Corrected Chart"), `src/core/contracts.ts` (API).

## Hard rules
- Never edit: `src/core/**`, `src/store/{counselor,search,detailCache}.ts`, `scripts/build-ror.ts`, `data/universities*.json`, `Design.md`, `DESIGN.md`, `.plans/**` except the plan you're executing (checkboxes + "Builder notes").
- Never commit, push, or switch branches. The orchestrator reviews and commits.
- bun only. Non-interactive commands only.
- **Real data only.** No mock data, seeded profiles, fake universities, or demo mode. Placeholder text is allowed only in input placeholders.
- If a step fails twice, stop and write it under "Builder notes".
- `tauri dev` on this machine needs `WEBKIT_DISABLE_DMABUF_RENDERER=1` (put it in your shell command, never in a committed file).

## How the UI reaches data
- Core API: `import { useCore } from '@/app/useCore'` (returns the real `CoreApi` from B). Errors from it are real `Error`s; show `error.message` in a designed error note, never swallow.
- `import { MissingKeyError, FINDER_NEEDS_OPENROUTER } from '@/core'` for the "missing key" states (Design §5.1).
- SQLite: `import { getDb } from '@/db/client'` (tauri-plugin-sql `Database`: `db.select<T[]>(sql, params)`, `db.execute(sql, params)`, params are `$1, $2…`).
- B's stores may be *used* (not edited): e.g. `new SqlCounselorStore(sqlClient)` from `@/store/counselor`, with `createTauriSqlClient()` from `@/core/adapters/tauri`.
- Keys: `@/store/secrets` (`getSecret/setSecret/deleteSecret`). Never write a key to SQLite, logs, or state that is persisted.
- Profile: `useProfile` from `@/store/profile`.

## Visual system (DESIGN.md is binding)
- Use the CSS tokens defined in `src/index.css` (slice 03 creates them) via Tailwind classes (`bg-background`, `text-foreground`, `border-hairline`, `text-chart-grey`, `bg-shoal`, `bg-signal`, `text-evidence`, `font-mono`…). **Never hard-code an oklch/hex color in a component**; dark mode depends on tokens.
- Use the shared primitives in `src/ui/components/` (Button, Input, Chip, Panel, FactLine, Flag, …). Don't restyle them per screen.
- Radii 2/4/6px only. No gradients, no drop shadows except the one "floating layer" shadow, no pill buttons, no emoji, no ALL-CAPS labels, no eyebrow labels, no `→` in button text, no middle-dot joined meta strings.
- One magenta (signal) action per screen region. Green (evidence) only for verified/official facts.
- Motion: keep the existing screen transition (AnimatePresence in `AppShell`). State changes 180ms `cubic-bezier(0.2,0,0,1)`. Nothing animates without a user cause except globe idle rotation and arriving search results. Respect `prefers-reduced-motion` (use Framer's `useReducedMotion`).
- Sizes to content so es/vi strings wrap, never truncate.

## i18n
- Every user-visible string goes through `t()`. One namespace per screen: `common`, `onboarding`, `counselor`, `finder`, `myUnis`, `settings` in `src/i18n/locales/{en,es,vi}/<ns>.json`; register new namespaces in `src/i18n/index.ts`.
- Write real, natural Spanish and Vietnamese. `bun run check:i18n` must pass.
- Copy style: sentence case, plain verbs, buttons name their action ("Save profile", not "Submit"). Errors say what to do.

## Verify (every slice, plus the slice's own checks)
```bash
bun run build
bun run check:i18n
bun test                      # B's 126 tests must still pass
(cd src-tauri && cargo check)
WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 90 bun tauri dev   # must stay up, no panic, no red errors in the log
```
Paste short results in your plan's "Builder notes".
