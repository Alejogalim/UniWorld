# 01 — Foundation, push 1: bare scaffold (unblocks B)

Goal: a Tauri 2 + Vite + React + TS app at the repo root that builds and opens a window.
Nothing else. Plugins, the DB, the shell, and i18n are push 2.

## Hard rules for the builder
- Do NOT edit or delete: `src/core/**`, `.plans/**` (except the checkboxes in this file), `Design.md`.
- Do NOT commit or push. The orchestrator reviews the diff and commits.
- Package manager: **bun** (never npm/yarn/pnpm lockfiles).
- Do not add the plugins, SQL, router, i18n, or the sidebar. Those are push 2.
- If a step fails twice, stop and write what failed under "Builder notes" at the bottom.

## Steps
- [x] 1. Scaffold into a scratch dir (the repo root isn't empty):
      `bun create tauri-app@latest uniworld-tmp -- --template react-ts --manager bun --identifier com.uniworld.app -y`
      (if those flags are rejected, run it interactively-free with whatever flags `--help` shows; template = React + TypeScript, manager = bun).
      Copy everything from `uniworld-tmp/` into the repo root (merge `src/`, keep the existing `src/core/contracts.ts`), then delete `uniworld-tmp/`.
- [x] 2. Naming: `productName` = `UniWorld`, window title `UniWorld`, `identifier` = `com.uniworld.app`, package name `uniworld`. Rust crate name `uniworld`.
- [x] 3. Tailwind v4 via `@tailwindcss/vite` (add the plugin in `vite.config.ts`, `@import "tailwindcss";` in `src/index.css`, or whichever CSS file `main.tsx` imports).
- [x] 4. Path alias `@/*` → `src/*` in `tsconfig.json` (and `tsconfig.app.json` if present) and in `vite.config.ts` (`resolve.alias`).
- [x] 5. shadcn/ui: `bunx shadcn@latest init` (defaults: New York or default style, neutral base color, CSS variables on). Then `bunx shadcn@latest add button` to prove it works. Components go to `src/components/ui/` — then move/configure so they live under `src/ui/components/` (set `aliases.components` = `@/ui/components`, `aliases.ui` = `@/ui/components/ui`, `aliases.lib`/`utils` = `@/lib` in `components.json`).
- [x] 6. Runtime deps: `bun add zustand framer-motion zod`.
- [x] 7. Replace the template's demo `App.tsx` with a minimal page: centered "UniWorld" heading, a small "Beta" badge, and one shadcn `<Button>`. Delete the template's demo assets/greet command usage in TS (keep the Rust side compiling; removing the `greet` command is fine).
- [x] 8. `package.json` scripts must include: `dev`, `build` (= `tsc -b && vite build` or `tsc --noEmit && vite build`), `tauri`. Add `"test": "vitest run"` only if vitest is installed — do NOT install vitest (B adds it).
- [x] 9. `.gitignore`: `node_modules`, `dist`, `src-tauri/target`, `src-tauri/gen/schemas` is fine to keep, `.env*`.
- [x] 10. Make sure `src/core/contracts.ts` is inside the TS `include` and compiles.

## Verify (run all, paste results in Builder notes)
```bash
bun install
bun run build                          # must pass, includes contracts.ts typecheck
(cd src-tauri && cargo check)          # must pass
timeout 120 bun tauri dev              # window must open; it's OK that timeout kills it
```
For `bun tauri dev`, success = the log shows the Rust binary compiled and started with no panic.

## Done =
All 10 boxes ticked, all verify commands green, `git status` shows only new scaffold files plus edits to `.gitignore`/this file.

## Builder notes

- Step 1 deviation: the `-y` flag is rejected by create-tauri-app; used `--yes` and dropped the `--` separator. Scaffold copied to root, `uniworld-tmp/` deleted. Template `.gitignore` kept.
- Step 5 deviation: `shadcn init` was non-interactive via `-y -t vite -b radix -p vega --css-variables`. Aliases set to `@/ui/components`, `@/ui/components/ui`, `@/lib`, `@/lib/utils`, `@/ui/hooks`. `button` lives at `src/ui/components/ui/button.tsx`. Stale `src/components/` removed.
- Extra cleanup: removed the template opener plugin (Rust, JS, capability) and the `greet` command. Removed `src/App.css`, `src/assets/`, and the template SVGs in `public/`. Index title is `UniWorld`.
- `cn` package kept as a runtime dep: shadcn's generated `src/lib/utils.ts` imports `cn` from it. `shadcn` moved to devDependencies.

Verify results:
- `bun install`: pass.
- `bun run build`: PASS (exit 0). `tsc` clean, including `src/core/contracts.ts`. Vite built 123 modules.
- `cd src-tauri && cargo check`: PASS (exit 0). First attempt failed on a leftover `tauri_plugin_opener::init()` line in `lib.rs`. Removed it and it passed.
- `timeout 120 bun tauri dev` (default Wayland backend): FAIL. Exit 1 after 3s. The binary started and printed `Gdk-Message: Error 71 (Protocol error) dispatching to Wayland display`. No panic.
- `GDK_BACKEND=x11 timeout 120 bun tauri dev`: PASS. Ran the full 120s with no panic, killed by timeout (exit 124).
- `WEBKIT_DISABLE_DMABUF_RENDERER=1 timeout 60 bun tauri dev` (native Wayland): PASS. Ran until timeout (exit 124), no panic. This is the environment workaround for the Wayland protocol error.
- Logs: `/tmp/claude-1000/-home-alejogalim-Documents-Projects-UniWorld/4fda90e1-a399-4df1-b5a5-8dec861f0ce5/scratchpad/tauri-dev.log` (default run), plus `tauri-dev-x11.log`, `tauri-dev-2.log`, `tauri-dev-3.log` in the same directory.

Open item: on this machine the default Wayland GDK path needs `WEBKIT_DISABLE_DMABUF_RENDERER=1` to stay up. The plan's verify command as written does not pass without it. Push 2 or a dev script should decide whether to bake that in.
