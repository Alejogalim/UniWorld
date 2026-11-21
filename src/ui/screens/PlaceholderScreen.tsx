import { useTranslation } from 'react-i18next';

/** Title plus a one-line "coming soon" empty state. No fake data. */
export function PlaceholderScreen({ titleKey }: { titleKey: string }) {
  const { t } = useTranslation('common');
  return (
    <section className="flex h-full flex-col gap-2 p-8">
      <h1 className="text-2xl font-semibold">{t(titleKey)}</h1>
      <p className="text-muted-foreground">{t('comingSoonLine')}</p>
    </section>
  );
}
