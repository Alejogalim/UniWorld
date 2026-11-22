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

/** Called once from main.tsx: applies the system theme at once, then the saved choice. */
export async function initTheme(): Promise<void> {
  apply(resolve('system'));
  let mode: ThemeMode = 'system';
  try {
    const saved = await getSetting('theme');
    if (saved === 'light' || saved === 'dark' || saved === 'system') mode = saved;
  } catch (err) {
    console.error('Failed to load theme setting', err);
  }
  const resolved = resolve(mode);
  apply(resolved);
  useTheme.setState({ mode, resolved });
}
