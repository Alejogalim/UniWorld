import { create } from 'zustand';
import { useCore } from '@/app/useCore';
import type { FinderEvent, Scope, SearchInput, UniResult } from '@/core/contracts';
import { FINDER_NEEDS_OPENROUTER, MissingKeyError } from '@/core';

export const MAX_SHOWN_RESULTS = 12;

export interface FinderFilters {
  tuitionFreeOnly: boolean;
  spokenLanguagesOnly: boolean;
  includeNeedToLearn: boolean;
}

export type FinderPhase = 'idle' | 'searching' | 'done' | 'error';

export interface FinderError {
  /** The OpenRouter key is missing: show the key note instead of a retry. */
  missingKey: boolean;
  message: string;
}

interface FinderState {
  careers: string[];
  scope: Scope;
  filters: FinderFilters;
  phase: FinderPhase;
  progress: string[];
  results: UniResult[];
  summary: { verified: number; removed: number } | null;
  error: FinderError | null;
  /** The search is shown in the two-column layout until "New search". */
  editing: boolean;
  setCareers(careers: string[]): void;
  addCareer(career: string): void;
  removeCareer(career: string): void;
  setScope(scope: Scope): void;
  toggleCountry(iso: string): void;
  setContinent(continent: NonNullable<Extract<Scope, { kind: 'continent' }>['continent']>): void;
  setFilter<K extends keyof FinderFilters>(key: K, value: FinderFilters[K]): void;
  setEditing(editing: boolean): void;
  search(): Promise<void>;
  reset(): void;
}

const INITIAL = {
  careers: [] as string[],
  scope: { kind: 'global' } as Scope,
  filters: { tuitionFreeOnly: false, spokenLanguagesOnly: true, includeNeedToLearn: false },
  phase: 'idle' as FinderPhase,
  progress: [] as string[],
  results: [] as UniResult[],
  summary: null,
  error: null,
  editing: false,
};

/** Keeps results sorted by fit (best first) and capped; a repeated rorId replaces the old row. */
export function insertResult(list: UniResult[], uni: UniResult): UniResult[] {
  const rest = list.filter((r) => r.rorId !== uni.rorId);
  return [...rest, uni].sort((a, b) => b.fit.overall - a.fit.overall).slice(0, MAX_SHOWN_RESULTS);
}

/** In-memory Finder state. It survives navigation, so a finished search is still there when the student returns. */
export const useFinder = create<FinderState>((set, get) => ({
  ...INITIAL,
  setCareers: (careers) => set({ careers }),
  addCareer: (career) => {
    const value = career.trim();
    if (!value || get().careers.includes(value)) return;
    set({ careers: [...get().careers, value] });
  },
  removeCareer: (career) => set({ careers: get().careers.filter((c) => c !== career) }),
  setScope: (scope) => set({ scope }),
  toggleCountry: (iso) => {
    const scope = get().scope;
    const codes = scope.kind === 'countries' ? scope.codes : [];
    const next = codes.includes(iso) ? codes.filter((c) => c !== iso) : [...codes, iso];
    set({ scope: next.length ? { kind: 'countries', codes: next } : { kind: 'global' } });
  },
  setContinent: (continent) => {
    const scope = get().scope;
    const same = scope.kind === 'continent' && scope.continent === continent;
    set({ scope: same ? { kind: 'global' } : { kind: 'continent', continent } });
  },
  setFilter: (key, value) => set({ filters: { ...get().filters, [key]: value } }),
  setEditing: (editing) => set({ editing }),
  search: async () => {
    const { careers, scope, filters } = get();
    if (careers.length === 0 || get().phase === 'searching') return;
    set({ phase: 'searching', progress: [], results: [], summary: null, error: null, editing: false });
    const input: SearchInput = { careers, scope, filters };
    const onEvent = (event: FinderEvent) => {
      switch (event.type) {
        case 'progress':
          set({ progress: [...get().progress, event.message] });
          break;
        case 'result':
          set({ results: insertResult(get().results, event.uni) });
          break;
        case 'done':
          set({ phase: 'done', summary: { verified: event.verified, removed: event.removed } });
          break;
        case 'error':
          set({
            phase: 'error',
            error: { missingKey: event.message === FINDER_NEEDS_OPENROUTER, message: event.message },
          });
          break;
      }
    };
    try {
      await useCore().finder.search(input, onEvent);
      if (get().phase === 'searching') set({ phase: 'done' });
    } catch (err) {
      const missingKey = err instanceof MissingKeyError;
      set({
        phase: 'error',
        error: { missingKey, message: err instanceof Error ? err.message : String(err) },
      });
    }
  },
  reset: () => set({ ...INITIAL, careers: get().careers, scope: get().scope, filters: get().filters }),
}));
