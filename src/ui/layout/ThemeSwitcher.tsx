import { useTranslation } from 'react-i18next';
import { Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useTheme, type ThemeMode } from '@/app/theme';

const ORDER: ThemeMode[] = ['system', 'light', 'dark'];
const ICON: Record<ThemeMode, LucideIcon> = { system: Monitor, light: Sun, dark: Moon };

/** Rail-footer theme control: a 32px icon button that cycles system, light, dark. */
export function ThemeSwitcher() {
  const { t } = useTranslation('common');
  const mode = useTheme((s) => s.mode);
  const setMode = useTheme((s) => s.setMode);
  const next = ORDER[(ORDER.indexOf(mode) + 1) % ORDER.length];
  const Icon = ICON[mode];
  const label = t('theme.current', { mode: t(`theme.${mode}`) });

  return (
    <button
      type="button"
      className="lang-button"
      title={label}
      aria-label={label}
      onClick={() => {
        setMode(next).catch((err: unknown) => console.error('Failed to save theme', err));
      }}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}
