import { create } from 'zustand';
import { getSetting, setSetting } from '@/store/settings';

export type ThemeMode = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

interface ThemeState {
  mode: ThemeMode;
  resolved: ResolvedTheme;
  setMode(mode: ThemeMode): Promise<void>;
}

const systemQuery = window.matchMedia('(prefers-color-scheme: dark)');

function resolve(mode: ThemeMode): ResolvedTheme {
  if (mode === 'system') return systemQuery.matches ? 'dark' : 'light';
  return mode;
}

function apply(resolved: ResolvedTheme) {
  document.documentElement.classList.toggle('dark', resolved === 'dark');
}

export const useTheme = create<ThemeState>((set) => ({
  mode: 'system',
  resolved: resolve('system'),

  async setMode(mode) {
    const resolved = resolve(mode);
    apply(resolved);
    set({ mode, resolved });
    cacheMode(mode);
    await setSetting('theme', mode);
  },
}));

// In `system` mode the page follows the OS setting while the app runs.
systemQuery.addEventListener('change', () => {
  if (useTheme.getState().mode !== 'system') return;
  const resolved = resolve('system');
  apply(resolved);
  useTheme.setState({ resolved });
});

const CACHE_KEY = 'uniworld.theme';

function isMode(value: unknown): value is ThemeMode {
  return value === 'system' || value === 'light' || value === 'dark';
}

/** Last chosen mode, kept in localStorage so the first paint already has the right palette. */
function readCachedMode(): ThemeMode | null {
  try {
    const value = window.localStorage.getItem(CACHE_KEY);
    return isMode(value) ? value : null;
  } catch {
    return null;
  }
}

function cacheMode(mode: ThemeMode): void {
  try {
    window.localStorage.setItem(CACHE_KEY, mode);
  } catch {
    // Storage can be blocked; the database copy is still written by setMode.
  }
}

/**
 * Called once from main.tsx before the first render. It applies the cached choice (or the
 * system theme) synchronously and never waits for the database. The saved choice is then
 * read in the background and applied, unless the user has already picked a mode meanwhile.
 */
export function initTheme(): void {
  const startMode = readCachedMode() ?? 'system';
  const resolved = resolve(startMode);
  apply(resolved);
  useTheme.setState({ mode: startMode, resolved });

  getSetting('theme')
    .then((saved) => {
      if (!isMode(saved) || useTheme.getState().mode !== startMode) return;
      cacheMode(saved);
      const next = resolve(saved);
      apply(next);
      useTheme.setState({ mode: saved, resolved: next });
    })
    .catch((err: unknown) => {
      console.error('Failed to load theme setting', err);
    });
}
