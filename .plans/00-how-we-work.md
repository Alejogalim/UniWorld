# How we work (read first, both of us)

Source of truth for *what* to build: `Design.md`. This file is *how we split it*.
Personal task lists: `A-frontend.md` (you) and `B-core.md` (teammate). Swap names freely.

## Rules that prevent merge pain
1. **Each of us owns folders. Never edit the other's folders.** Need a change there? Message them, or add a line to "Requests" at the bottom of their file.
2. **The contract is `src/core/contracts.ts`.** It's the only file we both touch, and only in the first hour (see below). After that it's frozen. Changing it needs a message to the other person first.
3. **One branch each**: `feat/a-ui`, `feat/b-core`. `main` always builds. Merge to `main` only at the checkpoints below, or when a slice is done and `bun run build` passes.
4. **Small commits, push often.** Rebase on `main` before each merge: `git fetch && git rebase origin/main`.
5. **Real data only** (Design §3). Mocks exist only as `*.stub.ts` for developing against the contract, and are removed before the feature freeze.
6. Every AI call is checked with Zod. Facts use the `Fact<T>` shape from the contract. No exceptions.

## Ownership

| Area | Owner |
|---|---|
| `src-tauri/**` (Rust, keychain, SQL plugin, http plugin, tauri.conf) | A |
| `src/ui/**`, `src/i18n/**`, `src/app/**` (routing, layout, Zustand), styles | A |
| `src/store/profile.ts`, `tracked.ts`, `settings.ts`, `secrets.ts` | A |
| `src/ui/globe/**`, `data/countries.geojson`, `data/country-continent.json` | A |
| `src/core/**` (ai, counselor, finder, grounding) | B |
| `src/store/counselor.ts`, `search.ts`, `detailCache.ts` | B |
| `scripts/build-ror.ts`, `data/universities.json` (ROR + Hipo) | B |
| `src/core/**/*.test.ts` | B |
| `src/core/contracts.ts`, `src/db/migrations/001_init.sql` | **shared, frozen after Step 0** |
| README, LICENSE, attributions, video | A drafts, B reviews |

## Step 0: Foundation (the only coupled part, ~1 hour, tonight)
- **A** (right now): scaffold Tauri 2 + Vite + React + TS + Tailwind + shadcn; add `tauri-plugin-sql`, `tauri-plugin-http`, `keyring`; app shell with the nav (Onboarding / Counselor / Finder / My Unis / Settings), i18next with en/es/vi; write `001_init.sql` from Design §6. Push to `main`.
- **B** (in parallel, doesn't need the scaffold): write `src/core/contracts.ts` (types below) and push it to `main` as soon as it's ready, then start on `scripts/build-ror.ts` and the grounding modules (they're pure TS and testable with vitest alone). Rebase on A's scaffold when it lands.
- Both agree on the contract in chat, then it's frozen.

## The contract (`src/core/contracts.ts`)
B writes it; A reviews. Shape to start from:

```ts
export type Lang = string;              // ISO 639-1
export type Level = 'A1'|'A2'|'B1'|'B2'|'C1'|'C2'|'native';
export type Program = 'IB'|'AP'|'US';

export interface Fact<T> {
  value: T | null; sourceUrl: string | null; quote: string | null;
  sourceKind: 'official'|'third_party'; checkedAt: string;
}

export interface Profile { name; primaryLang: Lang; uiLang: 'en'|'es'|'vi';
  languages: {lang: Lang; level: Level}[]; citizenship?: string; residence?: string;
  program: Program; grades?: unknown /* per Design §6 */; }

export interface CareerPath { id; title; summary; whyYou; degreeKeywords: string[];
  fitBreakdown: Record<string, number>; saved: boolean; }

export interface SearchInput {
  careers: string[];
  scope: {kind:'global'} | {kind:'continent'; continent: string} | {kind:'countries'; codes: string[]};
  filters: {tuitionFreeOnly: boolean; spokenLanguagesOnly: boolean; includeNeedToLearn: boolean};
}
export type FinderEvent =
  | {type:'progress'; message: string}
  | {type:'result'; uni: UniResult}
  | {type:'done'; verified: number; removed: number}
  | {type:'error'; message: string};

export interface UniResult { rorId; name; countryCode; city?; lat?; lng?; program: string;
  overview: Fact<string>; languages: Fact<string[]>; tuition: Fact<string>;
  fit: {career; admission:'Reach'|'Match'|'Safety'|'Unknown'; language; cost; overall: number};
  whyFits: string; sourceCount: number; }
export interface UniDetail { rorId; program: string; overview: Fact<string>;
  languages: Fact<string[]>; tuition: Fact<string>; scholarships: Fact<string>;
  deadlines: Fact<string>; nextDeadline: Fact<string>; exams: Fact<string[]>;
  requirements: Fact<string>; applyUrl: Fact<string>; checkedAt: string; }

// The functions the UI calls. B implements, A consumes.
export interface CoreApi {
  testConnection(provider:'openrouter'|'opencode'): Promise<{ok:boolean; error?:string}>;
  counselor: {
    start(): Promise<{sessionId:number}>;
    send(sessionId:number, text:string, onToken?:(t:string)=>void): Promise<string>;
    careers(sessionId:number): Promise<CareerPath[]>;
  };
  finder: {
    search(input:SearchInput, onEvent:(e:FinderEvent)=>void): Promise<void>;
    detail(rorId:string, program:string, opts?:{refresh?:boolean}): Promise<UniDetail>;
  };
}
```

Fixed intake questions and slider weights are UI-side (A) and passed in via `send`/`careers` args. B can extend the signatures when needed, with a message to A.

## Checkpoints (Swedish time)

| When | Goal |
|---|---|
| **Sat ~01:00** | **M1.** Scaffold + contract + SQL schema on `main`. Both branches rebased. |
| **Sun ~12:00** | **M2.** A: onboarding, globe, Uni Manager working against `stub`. B: ROR matcher + quote validator tested, Finder pipeline running from a script/CLI. Merge both. |
| **Sun ~16:00** | **M3.** Real `CoreApi` replaces the stub. Counselor and Finder work in the UI end to end. |
| **Sun 18:00** | **Feature freeze.** Only bug fixes after this. Remove all `*.stub.ts`. |
| Sun 18:00–20:00 | Windows installer, real recorded session, README, Devpost text |
| **Sun 20:30** | Submit (buffer before 21:00 Swedish / 12:00 PST) |

## Working with AI agents
- Give your agent **only your own file** (`A-frontend.md` or `B-core.md`) plus `Design.md` and the contract. Tell it which folders it may edit.
- Review the diff before committing. Run `bun run build` and the tests before every merge.
- Keep a note of which AI tools we used (needed for the disclosure in the README).

## Merge protocol
1. `git fetch && git rebase origin/main` on your branch.
2. `bun run build` and `bun test` pass.
3. Merge to `main` (fast-forward or PR). Tell the other person to rebase.
4. If a conflict appears in a folder you don't own, **take the owner's version** and message them.
