import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Languages } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { UiLang } from '@/core/contracts';
import { changeUiLanguage } from '@/app/language';

const LANGS: UiLang[] = ['en', 'es', 'vi'];

/** Sidebar-footer language menu: a 40px icon button over a themed popover, not the OS select. */
export function LanguageSwitcher() {
  const { t, i18n } = useTranslation('common');
  const current = (i18n.resolvedLanguage ?? 'en') as UiLang;
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Changing the language also saves it on the profile, so the next launch opens in it.
  const changeLanguage = (lng: UiLang) => {
    changeUiLanguage(lng).catch((err: unknown) => console.error('Failed to change the UI language', err));
    setOpen(false);
  };

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        className="lang-button"
        title={t('language.label')}
        aria-label={t('language.label')}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <Languages className="size-4" aria-hidden="true" />
      </button>

      {open && (
        <div
          role="listbox"
          aria-label={t('language.label')}
          className="rim surface absolute bottom-full left-0 z-20 mb-2 w-44 rounded-popover p-1 shadow-float"
        >
          {LANGS.map((lng) => {
            const selected = lng === current;
            return (
              <button
                key={lng}
                type="button"
                role="option"
                aria-selected={selected}
                onClick={() => changeLanguage(lng)}
                className={cn(
                  'relative flex min-h-9 w-full items-center rounded-control px-3 text-left text-sm text-foreground outline-none',
                  'hover:bg-shoal focus-visible:bg-shoal',
                  selected && 'pl-5 font-semibold before:absolute before:top-1/2 before:left-2 before:size-1.5 before:-translate-y-1/2 before:rounded-full before:bg-signal',
                )}
              >
                {t(`language.${lng}`)}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
