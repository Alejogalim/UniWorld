import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Button } from '@/ui/components/ui/button';
import { messageOf, SettingsSection } from './SettingsSection';

/** The data sources UniWorld is built on. Each link opens in the system browser. */
const SOURCES = [
  { url: 'https://ror.org', text: 'about.ror' },
  { url: 'https://github.com/Hipo/university-domains-list', text: 'about.domains' },
  { url: 'https://www.naturalearthdata.com', text: 'about.naturalEarth' },
] as const;

const siteOf = (url: string) => new URL(url).host.replace(/^www\./, '');

export function AboutSection() {
  const { t } = useTranslation('settings');
  const [version, setVersion] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    getVersion()
      .then((v) => {
        if (!cancelled) setVersion(v);
      })
      .catch(() => {
        // Outside the desktop app there is no version to read; the line stays empty.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = (url: string) => {
    setError(null);
    openUrl(url).catch((err: unknown) => setError(messageOf(err)));
  };

  return (
    <SettingsSection id="settings-about" title={t('sections.about')} line={t('sections.aboutLine')}>
      <p className="max-w-[68ch] text-sm leading-[1.55] text-foreground">{t('about.paragraph')}</p>

      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-semibold text-foreground">{t('about.sourcesTitle')}</h3>
        <ul className="flex flex-col border-t border-hairline">
          {SOURCES.map((source) => (
            <li key={source.url} className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline py-2.5">
              <span className="min-w-0 text-sm break-words text-foreground">{t(source.text)}</span>
              <Button variant="quiet" size="sm" onClick={() => open(source.url)}>
                {t('about.open', { site: siteOf(source.url) })}
              </Button>
            </li>
          ))}
        </ul>
        {error && <ErrorNote message={error} />}
      </div>

      <p className="text-sm text-chart-grey">
        {t('about.version')}{' '}
        <span className="font-mono text-xs font-medium tabular-nums text-foreground">{version ?? '—'}</span>
      </p>
    </SettingsSection>
  );
}
