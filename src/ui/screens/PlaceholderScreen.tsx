import { useTranslation } from 'react-i18next';

/** One-line "coming soon" empty state. The page title lives in the shell's top bar. */
export function PlaceholderScreen() {
  const { t } = useTranslation('common');
  return (
    <section className="flex h-full flex-col gap-2 p-8">
      <p className="text-muted-foreground">{t('comingSoonLine')}</p>
    </section>
  );
}
