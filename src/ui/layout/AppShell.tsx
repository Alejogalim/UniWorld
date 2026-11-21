import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation, useOutlet } from 'react-router';
import { ListChecks, MessageCircle, Globe, Settings, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './LanguageSwitcher';

const NAV: { to: string; key: string; icon: LucideIcon }[] = [
  { to: '/onboarding', key: 'nav.onboarding', icon: Sparkles },
  { to: '/counselor', key: 'nav.counselor', icon: MessageCircle },
  { to: '/finder', key: 'nav.finder', icon: Globe },
  { to: '/my-unis', key: 'nav.myUnis', icon: ListChecks },
  { to: '/settings', key: 'nav.settings', icon: Settings },
];

export function AppShell() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const outlet = useOutlet();

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <aside className="flex w-[220px] shrink-0 flex-col border-r bg-muted/40 p-4">
        <div className="mb-6 flex items-center gap-2">
          <span className="text-lg font-bold">{t('appName')}</span>
          <span className="rounded-full border px-2 py-0.5 text-xs font-medium">{t('beta')}</span>
        </div>
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-accent font-medium text-accent-foreground'
                    : 'text-muted-foreground hover:bg-accent/60 hover:text-foreground',
                )
              }
            >
              <Icon className="size-4" aria-hidden="true" />
              {t(key)}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <LanguageSwitcher />
        </div>
      </aside>
      <main className="relative flex-1 overflow-auto">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            className="h-full"
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -8 }}
            transition={{ duration: 0.18 }}
          >
            {outlet}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
