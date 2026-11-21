import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { NavLink, useLocation, useOutlet } from 'react-router';
import { ListChecks, MessageCircle, Globe, Settings, Sparkles, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LanguageSwitcher } from './LanguageSwitcher';

const NAV: { to: string; key: string; titleKey: string; icon: LucideIcon }[] = [
  { to: '/onboarding', key: 'nav.onboarding', titleKey: 'screens.onboarding', icon: Sparkles },
  { to: '/counselor', key: 'nav.counselor', titleKey: 'screens.counselor', icon: MessageCircle },
  { to: '/finder', key: 'nav.finder', titleKey: 'screens.finder', icon: Globe },
  { to: '/my-unis', key: 'nav.myUnis', titleKey: 'screens.myUnis', icon: ListChecks },
  { to: '/settings', key: 'nav.settings', titleKey: 'screens.settings', icon: Settings },
];

/**
 * Four quadrants: logo corner | top bar (page title), sidebar | content.
 * The two left cells carry the same rail gradient, so it reads as one column.
 */
export function AppShell() {
  const { t } = useTranslation('common');
  const location = useLocation();
  const outlet = useOutlet();
  const active = NAV.find((item) => location.pathname.startsWith(item.to));

  return (
    <div className="grid h-screen grid-cols-[220px_1fr] grid-rows-[auto_1fr] overflow-hidden bg-background text-foreground">
      <div className="app-rail flex items-baseline gap-2 self-baseline px-4 py-4">
        <span className="wordmark">{t('appName')}</span>
        <span className="rounded-full border px-2 py-0.5 text-[10px] font-medium">{t('beta')}</span>
      </div>

      <header className="flex items-baseline justify-between self-baseline bg-background px-8 py-4">
        <h1 key={location.pathname} className="screen-title">
          <span className="screen-title__type">{t(active?.titleKey ?? 'appName')}</span>
        </h1>
      </header>

      <aside className="app-rail flex flex-col px-4 pb-4">
        <nav className="flex flex-col gap-1">
          {NAV.map(({ to, key, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'nav-item relative flex items-center gap-2 rounded-[4px] px-3 py-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[oklch(0.5_0.195_355)]',
                  isActive
                    ? 'font-bold text-[oklch(0.255_0.033_250)]'
                    : 'text-[oklch(0.52_0.022_245)] hover:text-[oklch(0.255_0.033_250)]',
                )
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="nav-item__icon size-4" strokeWidth={1.75} aria-hidden="true" />
                  {t(key)}
                  {isActive && (
                    <span
                      aria-hidden="true"
                      className="nav-item__fix absolute -left-2 top-1/2 size-[3px] -translate-y-1/2 rounded-full bg-[oklch(0.255_0.033_250)]"
                    />
                  )}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto">
          <LanguageSwitcher />
        </div>
      </aside>

      <main className="relative overflow-auto">
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
