import { useTranslation } from 'react-i18next';
import { EmptyState } from '@/ui/components/EmptyState';

/** "Coming soon" empty state inside the page measure. The page title lives in the shell's top bar. */
export function PlaceholderScreen() {
  const { t } = useTranslation('common');
  return (
    <div className="max-w-[1120px] px-12 py-8">
      <EmptyState title={t('comingSoon')} description={t('comingSoonLine')} />
    </div>
  );
}
