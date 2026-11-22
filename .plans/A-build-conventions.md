# A — build conventions (every builder reads this first)

Context: UniWorld is a Tauri 2 desktop app. Person A owns the UI; Person B owns `src/core/**` (already implemented, real, tested).
Source of truth: `Design.md` (product), `DESIGN.md` (visual system: "The Ember Chart"), `src/core/contracts.ts` (API).

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
- Use the CSS tokens defined in `src/index.css` via Tailwind classes (`bg-background`, `text-foreground`, `border-hairline`, `text-chart-grey`, `bg-shoal`, `bg-signal`, `text-evidence`, `rounded-pill`, `rounded-card`, `rounded-control`, `rounded-popover`). **Never hard-code an oklch/hex color in a component**; dark mode depends on tokens.
- Font: Inter Variable only. Numerals use `.font-mono` (tabular, no tracking) or `tabular-nums`. Type classes: `.type-display`, `.type-headline`, `.type-title`, `.type-body`, `.type-label`.
- Shape lock: four radii and nothing else. `rounded-pill` (999px) for action buttons, chips, badges, toggles and round icon buttons; `rounded-card` (28px) for panels and cards; `rounded-control` (14px) for inputs, selects, textareas, comboboxes and nav rows; `rounded-popover` (20px) for popovers, chat bubbles and row hover surfaces. Circles only for the globe, flag discs and dots. No other radius values.
- Gradients and glow only in these places: the dark `Panel` surface and rim (`.surface`, `.rim`), one `.panel-ember` per screen (outer glow only, no inner wash, both themes), the `.ember-button` primary fill, `.numeral-ember`, the static `.ambient-haze` (both themes), the toggle-on and progress dot (`.ember-fill`), and the globe atmosphere. No other gradients, and nothing that glows is ever animated.
- Use the shared primitives in `src/ui/components/` (Button, Input, Chip, Panel, FactLine, Flag, …). Don't restyle them per screen; style a screen through the primitives and tokens.
- One magenta (signal) action per screen region; at most one `.panel-ember` per screen. Green (evidence) only for verified/official facts.
- Two-tone headlines (grey body, ink phrase in a `<strong>`) only on empty-state titles.
- Starfield: both themes (white stars on the night sky, warm specks and ember sparks on paper; colours from the `--star-*` tokens), one static canvas behind everything plus ten CSS twinkles and a rare shooting star (plans 21, 26). No per-frame JS; `prefers-reduced-motion` gets the static canvas only.
- Motion: keep the existing screen transition (AnimatePresence in `AppShell`). State changes 180ms `cubic-bezier(0.2,0,0,1)`; press feedback scales to 0.97 in 120ms. Nothing animates without a user cause except globe idle rotation, arriving search results and the stars. Respect `prefers-reduced-motion` (use Framer's `useReducedMotion`).
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
