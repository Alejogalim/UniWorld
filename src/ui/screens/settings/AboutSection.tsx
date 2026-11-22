import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getVersion } from '@tauri-apps/api/app';
import { openUrl } from '@tauri-apps/plugin-opener';
import { ExternalLink } from 'lucide-react';
import { ErrorNote } from '@/ui/components/ErrorNote';
import { Button } from '@/ui/components/ui/button';
import { messageOf, SettingsGroup, SettingsRow } from './SettingsGroup';

/** The data sources UniWorld is built on. Each link opens in the system browser. */
const SOURCES = [
  { url: 'https://ror.org', name: 'about.rorName', text: 'about.ror' },
  { url: 'https://github.com/Hipo/university-domains-list', name: 'about.domainsName', text: 'about.domains' },
  { url: 'https://www.naturalearthdata.com', name: 'about.naturalEarthName', text: 'about.naturalEarth' },
] as const;

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
    <SettingsGroup id="settings-about" title={t('sections.about')} footer={t('about.paragraph')}>
      <SettingsRow label={t('about.version')}>
        <span className="font-mono text-[0.8125rem] font-medium tabular-nums text-chart-grey">{version ?? '—'}</span>
      </SettingsRow>
      <SettingsRow label={t('about.sources')} below={error ? <ErrorNote message={error} /> : undefined}>
        {SOURCES.map((source) => (
          <Button key={source.url} variant="quiet" size="sm" className="px-2" title={t(source.text)} onClick={() => open(source.url)}>
            {t(source.name)}
            <ExternalLink aria-hidden="true" className="size-3" />
          </Button>
        ))}
      </SettingsRow>
    </SettingsGroup>
  );
}
